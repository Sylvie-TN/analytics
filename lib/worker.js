function create() {
    fetch("/data/create", {
        method: "POST",
        body: location.origin
    }).then(response => response.json()).then(({ result: id }) => {
        let currentData = {
            stage: 1
        };

        let locations = [];

        self.onmessage = function({ data }) {
            if (data == "terminate") {
                fetch("/data/kill", {
                    body: id,
                    method: "POST"
                });

                return;
            }
            
            locations = data;

            var newData = [
                id,
                locations
            ];

            if (JSON.stringify(newData) !== JSON.stringify(currentData)) fetch("/data/mod", {
                body: JSON.stringify(currentData = newData),
                method: "POST"
            });
        }

        var int = setInterval(async function() {
            fetch("/data/alive", {
                mode: "no-cors",
                body: id,
                method: "POST"
            }).then(response => response.json()).then(({ result: alive }) => {
                if (!alive) {
                    clearInterval(int);
                    
                    create();
                }
            });
        }, 10000);
    });
}

create();