if ("Worker" in window && window.sessionStorage.getItem("analytics") !== "true") {
    window.sessionStorage.setItem("analytics", "true");

    window.analyticsWorker = new Worker("/data/worker.js");

    analyticsWorker.postMessage(location.href);

    setInterval(async function() {
        analyticsWorker.postMessage(location.href);
    }, 10000);

    onbeforeunload = function() {
        analyticsWorker.postMessage("terminate");
        window.sessionStorage.setItem("analytics", "false");
    }
}