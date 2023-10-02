// lib/analytics.ts
import fs from "node:fs";
import * as zlib from "node:zlib";
var Analytics = class {
  constructor(prefix = "/data") {
    this.prefix = prefix;
    this.routes = [];
    this.handlers = {};
    this.users = [];
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
      "/create": (body) => {
        const id = this.id();
        this.users.push({
          id,
          data: body,
          time: (/* @__PURE__ */ new Date()).getTime() + 22 * 1e3
        });
        return id;
      },
      "/alive": (id, method) => {
        if (method !== "POST")
          return false;
        var user = this.users.findIndex((user2) => user2.id === id);
        if (user > -1) {
          this.users[user].time = (/* @__PURE__ */ new Date()).getTime() + 22 * 1e3;
        } else {
          return false;
        }
        return true;
      },
      "/kill": (id) => {
        var user = this.users.findIndex((user2) => user2.id === id);
        if (user > -1) {
          this.users.splice(user, 1);
        } else {
          return false;
        }
        return true;
      },
      "/mod": (body) => {
        let [id, data] = JSON.parse(body);
        var index = this.users.findIndex((user) => user.id === id);
        if (index < 0)
          return false;
        this.users[index].data = data;
        return true;
      }
    }).map(([key, value]) => [key.replace(/\/$/g, ""), value]));
    setInterval(() => this.check(), 1e3);
  }
  id() {
    return Math.random().toString(26).slice(-8);
  }
  check() {
    const now = (/* @__PURE__ */ new Date()).getTime();
    this.users = this.users.filter((user) => {
      return user.time > now;
    });
  }
  routePath(req) {
    return this.routes.indexOf(req.url?.replace(/\/$/g, "") || "") > -1;
  }
  request(req, res) {
    var chunks = [];
    req.on("data", (data) => {
      chunks.push(data);
    }).on("end", () => {
      const body = Buffer.concat(chunks).toString();
      const id = body;
      const handler = this.handlers[req.url?.replace(/\/$/g, "")?.replace(this.prefix, "") || ""];
      if (handler) {
        const result = handler(id, req.method || "GET");
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ result }));
      } else if (req.url === this.prefix + "/worker.js") {
        res.writeHead(200, { "Content-Type": "application/javascript", "content-encoding": "gzip" });
        const output = zlib.createGzip();
        output.pipe(res);
        output.write(atob("ZnVuY3Rpb24gY3JlYXRlKCkgewogICAgZmV0Y2goIi9kYXRhL2NyZWF0ZSIsIHsKICAgICAgICBtZXRob2Q6ICJQT1NUIiwKICAgICAgICBib2R5OiBsb2NhdGlvbi5vcmlnaW4KICAgIH0pLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKS50aGVuKCh7IHJlc3VsdDogaWQgfSkgPT4gewogICAgICAgIGxldCBjdXJyZW50RGF0YSA9IHsKICAgICAgICAgICAgc3RhZ2U6IDEKICAgICAgICB9OwoKICAgICAgICBsZXQgbG9jYXRpb25zID0gW107CgogICAgICAgIHNlbGYub25tZXNzYWdlID0gZnVuY3Rpb24oeyBkYXRhIH0pIHsKICAgICAgICAgICAgbG9jYXRpb25zID0gZGF0YTsKCiAgICAgICAgICAgIHZhciBuZXdEYXRhID0gWwogICAgICAgICAgICAgICAgaWQsCiAgICAgICAgICAgICAgICBsb2NhdGlvbnMKICAgICAgICAgICAgXTsKCiAgICAgICAgICAgIGlmIChKU09OLnN0cmluZ2lmeShuZXdEYXRhKSAhPT0gSlNPTi5zdHJpbmdpZnkoY3VycmVudERhdGEpKSBmZXRjaCgiL2RhdGEvbW9kIiwgewogICAgICAgICAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoY3VycmVudERhdGEgPSBuZXdEYXRhKSwKICAgICAgICAgICAgICAgIG1ldGhvZDogIlBPU1QiCiAgICAgICAgICAgIH0pOwogICAgICAgIH0KCiAgICAgICAgdmFyIGludCA9IHNldEludGVydmFsKGFzeW5jIGZ1bmN0aW9uKCkgewogICAgICAgICAgICBmZXRjaCgiL2RhdGEvYWxpdmUiLCB7CiAgICAgICAgICAgICAgICBtb2RlOiAibm8tY29ycyIsCiAgICAgICAgICAgICAgICBib2R5OiBpZCwKICAgICAgICAgICAgICAgIG1ldGhvZDogIlBPU1QiCiAgICAgICAgICAgIH0pLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKS50aGVuKCh7IHJlc3VsdDogYWxpdmUgfSkgPT4gewogICAgICAgICAgICAgICAgaWYgKCFhbGl2ZSkgewogICAgICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaW50KTsKICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICBjcmVhdGUoKTsKICAgICAgICAgICAgICAgIH0KICAgICAgICAgICAgfSk7CiAgICAgICAgfSwgMTAwMDApOwogICAgfSk7Cn0KCmNyZWF0ZSgpOw=="));
        output.flush();
        output.end();
      } else if (req.url === this.prefix + "/index.js") {
        res.writeHead(200, { "Content-Type": "application/javascript", "content-encoding": "gzip" });
        const output = zlib.createGzip();
        output.pipe(res);
        output.write(atob("aWYgKCJXb3JrZXIiIGluIHdpbmRvdykgewogICAgd2luZG93LmFuYWx5dGljc1dvcmtlciA9IG5ldyBXb3JrZXIoIi9kYXRhL3dvcmtlci5qcyIpOwoKICAgIGFuYWx5dGljc1dvcmtlci5wb3N0TWVzc2FnZShsb2NhdGlvbi5ocmVmKTsKCiAgICBzZXRJbnRlcnZhbChhc3luYyBmdW5jdGlvbigpIHsKICAgICAgICBhbmFseXRpY3NXb3JrZXIucG9zdE1lc3NhZ2UobG9jYXRpb24uaHJlZik7CiAgICB9LCAxMDAwMCk7Cn0="));
        output.flush();
        output.end();
      } else if (req.url === this.prefix + "/live") {
        res.writeHead(200, { "Content-Type": "text/html", "content-encoding": "gzip" });
        const output = zlib.createGzip();
        output.pipe(res);
        output.write(atob("PCFET0NUWVBFIGh0bWw+CjxodG1sIGxhbmc9ImVuIj4KICAgIDxoZWFkPgogICAgICAgIDxzdHlsZT4KICAgICAgICBAaW1wb3J0IHVybCgnaHR0cHM6Ly9mb250cy5nb29nbGVhcGlzLmNvbS9jc3MyP2ZhbWlseT1Sb2JvdG86d2dodEAzMDAmZGlzcGxheT1zd2FwJyk7CgogICAgICAgIGJvZHkgewogICAgICAgICAgICBiYWNrZ3JvdW5kLXNpemU6IDEwcHggMTAwMHB4ICFpbXBvcnRhbnQ7CiAgICAgICAgICAgIGJhY2tncm91bmQ6IHJnYigwLCAwLCAwKTsKICAgICAgICAgICAgbWFyZ2luOiAwOwogICAgICAgICAgICBmb250LXdlaWdodDogYm9sZGVyOwogICAgICAgICAgICBvdmVyZmxvdzogaGlkZGVuIGF1dG87CiAgICAgICAgICAgIHdpZHRoOiAxMDAlOwogICAgICAgICAgICB1c2VyLXNlbGVjdDogbm9uZTsKICAgICAgICAgICAgLXdlYmtpdC11c2VyLXNlbGVjdDogbm9uZTsKICAgICAgICAgICAgaGVpZ2h0OiAxMDB2aDsKICAgICAgICAgICAgdGV4dC1hbGlnbjogY2VudGVyOwogICAgICAgIH0KCiAgICAgICAgKiB7CiAgICAgICAgICAgIGZvbnQtZmFtaWx5OiBSb2JvdG8sIHNhbnMtc2VyaWY7CiAgICAgICAgfQoKICAgICAgICAubWFpbi1jb250YWluZXIgewogICAgICAgICAgICBwYWRkaW5nOiAzMHB4OwogICAgICAgICAgICBwYWRkaW5nLXRvcDogMDsKICAgICAgICAgICAgY29sb3I6IHdoaXRlOwogICAgICAgICAgICBtYXJnaW4tdG9wOiAyMHB4OwogICAgICAgICAgICB6LWluZGV4OiAxOwogICAgICAgICAgICBoZWlnaHQ6IG1heC1jb250ZW50OwogICAgICAgICAgICB3aWR0aDogY2FsYygxMDAlIC0gNjBweCk7CiAgICAgICAgICAgIGNvbHVtbnM6IDMgYXV0bzsKICAgICAgICAgICAgZGlzcGxheTogZmxleDsKICAgICAgICAgICAgZmxleC1kaXJlY3Rpb246IHJvdzsKICAgICAgICAgICAgZmxleC13cmFwOiB3cmFwOwogICAgICAgICAgICB0ZXh0LWFsaWduOiBjZW50ZXI7CiAgICAgICAgICAgIGp1c3RpZnktY29udGVudDogY2VudGVyOwogICAgICAgIH0KCiAgICAgICAgYSB7CiAgICAgICAgICAgIGNvbG9yOiB3aGl0ZTsKICAgICAgICB9CgogICAgICAgIC5hbmFseXRpYy1jb250YWluZXIgewogICAgICAgICAgICBtYXJnaW4tdG9wOiA1MHB4OwogICAgICAgICAgICB3aWR0aDogNjAlOwogICAgICAgICAgICBiYWNrZ3JvdW5kOiB3aGl0ZTsKICAgICAgICAgICAgaGVpZ2h0OiA1MDBweDsKICAgICAgICAgICAgYm9yZGVyLXJhZGl1czogNXB4OwogICAgICAgICAgICBvdmVyZmxvdzogYXV0bzsKICAgICAgICAgICAgY29sb3I6IGJsYWNrOwogICAgICAgIH0KCiAgICAgICAgLmFuYWx5dGljcy1oZWFkZXIgewogICAgICAgICAgICB3aWR0aDogY2FsYygxMDAlIC0gNDBweCk7CiAgICAgICAgICAgIHBhZGRpbmc6IDIwcHg7CiAgICAgICAgICAgIGZvbnQtc2l6ZTogMTVweDsKICAgICAgICAgICAgaGVpZ2h0OiAxNXB4OwogICAgICAgICAgICBtYXJnaW4tYm90dG9tOiAyMHB4OwogICAgICAgICAgICBib3JkZXItYm90dG9tOiAxcHggc29saWQgIzMzMzsKICAgICAgICB9CgogICAgICAgIC5hbmFseXRpY3MtZW50cnkgewogICAgICAgICAgICB3aWR0aDogOTAlOwogICAgICAgICAgICBib3JkZXItdG9wOiAxcHggc29saWQgcmdiKDEwMCwgMTAwLCAxMDAsIDAuNSk7CiAgICAgICAgICAgIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCByZ2IoMTAwLCAxMDAsIDEwMCwgMC41KTsKICAgICAgICAgICAgbWFyZ2luOiBhdXRvOwogICAgICAgICAgICBoZWlnaHQ6IDIwcHg7CiAgICAgICAgICAgIHBhZGRpbmc6IDVweDsKICAgICAgICAgICAgbWFyZ2luLWJvdHRvbTogMTBweDsKICAgICAgICB9CgogICAgICAgIC5hbmFseXRpYy1jb250YWluZXItc2l0ZXMgewogICAgICAgICAgICB3aWR0aDogMTAwJTsKICAgICAgICB9CgogICAgICAgIC5hbmFseXRpY3Mtc2l0ZS1uYW1lIHsKICAgICAgICAgICAgZmxvYXQ6IGxlZnQ7CiAgICAgICAgICAgIHRleHQtZGVjb3JhdGlvbjogbm9uZTsKICAgICAgICAgICAgZm9udC13ZWlnaHQ6IGJvbGQ7CiAgICAgICAgICAgIGZvbnQtc2l6ZTogMjBweDsKICAgICAgICAgICAgY29sb3I6ICM1ODg0ZDU7CiAgICAgICAgfQoKICAgICAgICAuYW5hbHl0aWNzLXNpdGUtY291bnQgewogICAgICAgICAgICBmb250LXNpemU6IDE0cHg7CiAgICAgICAgICAgIGhlaWdodDogMTRweDsKICAgICAgICAgICAgcGFkZGluZy10b3A6IDNweDsKICAgICAgICAgICAgcGFkZGluZy1ib3R0b206IDNweDsKICAgICAgICAgICAgZmxvYXQ6IHJpZ2h0OwogICAgICAgIH0KICAgICAgICA8L3N0eWxlPgogICAgPC9oZWFkPgogICAgPGJvZHk+CiAgICAgICAgPGRpdiBjbGFzcz0ibWFpbi1jb250YWluZXIiPgogICAgICAgICAgPGRpdiBjbGFzcz0iYW5hbHl0aWMtY29udGFpbmVyIj4KICAgICAgICAgICAgPGRpdiBjbGFzcz0iYW5hbHl0aWNzLWhlYWRlciI+CiAgICAgICAgICAgICAgPHNwYW4gc3R5bGU9ImZsb2F0OmxlZnQiPkxpdmUgVXNlciBDb3VudDwvc3Bhbj4KICAgICAgICAgICAgICA8c3BhbiBzdHlsZT0iZmxvYXQ6cmlnaHQiPjxzcGFuIGNsYXNzPSJ1c2VyLWNvdW50LWFuYWx5dGljcyI+MDwvc3Bhbj4gVXNlcnM8L3NwYW4+CiAgICAgICAgICAgIDwvZGl2PgogICAgICAgICAgICA8ZGl2IGNsYXNzPSJhbmFseXRpYy1jb250YWluZXItc2l0ZXMiPjwvZGl2PgogICAgICAgICAgPC9kaXY+CiAgICAgICAgPC9kaXY+CgogICAgICAgIDxzY3JpcHQ+CiAgICAgICAgICAgIGZ1bmN0aW9uIEluaXRpYXRlQW5hbHl0aWNzKCkgewogICAgICAgICAgICAgICAgZmV0Y2goJy9kYXRhL2RhdGEvJykudGhlbihlPT5lLnRleHQoKSkudGhlbih0ZXh0ID0+IHsKICAgICAgICAgICAgICAgICAgICB2YXIgc2l0ZXMgPSB7fTsKCiAgICAgICAgICAgICAgICAgICAgdHJ5IHsKICAgICAgICAgICAgICAgICAgICAgICAgSlNPTi5wYXJzZSh0ZXh0KQogICAgICAgICAgICAgICAgICAgIH0gY2F0Y2gge3JldHVybiBudWxsfTsKICAgICAgICAgICAgICAgICAgICB0ZXh0ID0gSlNPTi5wYXJzZSh0ZXh0KS5yZXN1bHQ7CgogICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy51c2VyLWNvdW50LWFuYWx5dGljcycpLmlubmVyVGV4dCA9IHRleHQubGVuZ3RoOwoKICAgICAgICAgICAgICAgICAgICB0ZXh0Lm1hcCgKICAgICAgICAgICAgICAgICAgICAgICAgZSA9PiBzaXRlc1tuZXcgVVJMKGUuZGF0YSkub3JpZ2luXSA/IHNpdGVzW25ldyBVUkwoZS5kYXRhKS5vcmlnaW5dKysgOiBzaXRlc1tuZXcgVVJMKGUuZGF0YSkub3JpZ2luXSA9IDEKICAgICAgICAgICAgICAgICAgICApOwoKICAgICAgICAgICAgICAgICAgICBzaXRlcyA9IE9iamVjdC5lbnRyaWVzKHNpdGVzKTsKCiAgICAgICAgICAgICAgICAgICAgc2l0ZXMgPSBzaXRlcy5zb3J0KGZ1bmN0aW9uKGEsYikgewogICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYVsxXSAtIGJbMV07CiAgICAgICAgICAgICAgICAgICAgfSkucmV2ZXJzZSgpOwogICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5hbmFseXRpYy1jb250YWluZXItc2l0ZXMnKS5pbm5lckhUTUwgPSAoCiAgICAgICAgICAgICAgICAgICAgICAgIHNpdGVzCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAubWFwKGU9PmA8ZGl2IGNsYXNzPSJhbmFseXRpY3MtZW50cnkiPjxhIHRhcmdldD0iX2JsYW5rIiBjbGFzcz0iYW5hbHl0aWNzLXNpdGUtbmFtZSIgaHJlZj0iJHtlWzBdfSI+JHtlWzBdfTwvYT48c3BhbiBjbGFzcz0iYW5hbHl0aWNzLXNpdGUtY291bnQiPiR7ZVsxXX08L3NwYW4+YCkKICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5qb2luKCc8L2Rpdj4nKQogICAgICAgICAgICAgICAgICAgICk7CiAgICAgICAgICAgICAgICB9KQogICAgICAgICAgICB9CgogICAgICAgICAgICBJbml0aWF0ZUFuYWx5dGljcygpOwoKICAgICAgICAgICAgc2V0SW50ZXJ2YWwoSW5pdGlhdGVBbmFseXRpY3MsIDUwMDApCiAgICAgICAgPC9zY3JpcHQ+CiAgICA8L2JvZHk+CjwvaHRtbD4="));
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
};
export {
  Analytics as default
};
