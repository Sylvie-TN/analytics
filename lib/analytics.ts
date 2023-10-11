import { IncomingMessage, OutgoingMessage, ServerResponse } from "node:http";
import fs from "node:fs";
import * as zlib from "node:zlib";

interface User {
    id: string;
    data: any;
    time: number;
    ip?: string;
}

export default class Analytics {
    routes: string[] = [];
    handlers: { [key: string]: (...args: any[]) => any } = {};

    id() {
        return Math.random().toString(26).slice(-8);
    }

    users: User[] = [

    ]

    check() {
        const now = new Date().getTime();

        this.users = this.users.filter(user => {
            return user.time > now;
        });
    }

    constructor(public prefix = "/data") {
        this.routes = [
            this.prefix + "/data",
            this.prefix,
            this.prefix + "/create",
            this.prefix + "/alive",
            this.prefix + "/kill",
            this.prefix + "/mod",
            this.prefix + "/worker.js",
            this.prefix + "/index.js",
            this.prefix + "/live"
        ];

        this.handlers = Object.fromEntries(Object.entries({
            "/data": () => {
                return this.users;
            },
            "": () => {
                return this.routes;
            },
            "/create": (body: any, method: string, ip: string) => {
                const id = this.id();
    
                this.users.push({
                    id,
                    data: body,
                    time: new Date().getTime() + 22 * 1000,
                    ip
                });
    
                return id;
            },
            "/alive": (id: string, method: string) => {
                if (method !== "POST") return false;
                
                var user = this.users.findIndex(user => user.id === id);
    
                if (user > -1) {
                    this.users[user].time = new Date().getTime() + 22 * 1000;
                } else {
                    return false;
                }
    
                return true;
            },
            "/kill": (id: string) => {
                var user = this.users.findIndex(user => user.id === id);
    
                if (user > -1) {
                    this.users.splice(user, 1);
                } else {
                    return false;
                }
    
                return true;
            },
            "/mod": (body: string) => {
                let [ id, data ]: string[] = JSON.parse(body);
    
                var index = this.users.findIndex(user => user.id === id);
    
                if (index < 0) return false;
    
                this.users[index].data = data;
    
                return true;
            }
        }).map(([key, value]) => [key.replace(/\/$/g, ""), value]));

        setInterval(() => this.check(), 1000);
    }

    routePath(req: Request | IncomingMessage) {
        return this.routes.indexOf(req.url?.replace(/\/$/g, "") || "") > -1;
    }

    request(req: IncomingMessage, res: ServerResponse) {
        var chunks: Uint8Array[] = [];
        req.on("data", (data: any) => {
            chunks.push(data);
        }).on("end", () => {
            const body = Buffer.concat(chunks).toString();
            const id = body;

            const handler = this.handlers[req.url?.replace(/\/$/g, "")?.replace(this.prefix, "") || ""];

            if (handler) {
                const result = handler(id, req.method || "GET", (req as any).socket.remoteAddress || req.headers["x-forwarded-for"] || "");

                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ result }));
            } else if (req.url === this.prefix + "/worker.js") {
                res.writeHead(200, { "Content-Type": "application/javascript", 'content-encoding': 'gzip' });
    
                const output = zlib.createGzip();
                output.pipe(res as any);
                output.write(fs.readFileSync(import.meta.dir + "/worker.js", "utf8"));
                output.flush();
                output.end();
            } else if (req.url === this.prefix + "/index.js") {
                res.writeHead(200, { "Content-Type": "application/javascript", 'content-encoding': 'gzip' });

                const output = zlib.createGzip();
                output.pipe(res as any);
                output.write(fs.readFileSync(import.meta.dir + "/index.js", "utf8"));
                output.flush();
                output.end();
            } else if (req.url === this.prefix + "/live") {
                res.writeHead(200, { "Content-Type": "text/html", 'content-encoding': 'gzip' });

                const output = zlib.createGzip();
                output.pipe(res as any);
                output.write(fs.readFileSync(import.meta.dir + "/data.html", "utf8"));
                output.flush();
                output.end();
            } else {
                res.writeHead(404, {
                    "Content-Type": "application/json"
                });
                res.end(JSON.stringify(this.routes));
            }
        });
    }
}