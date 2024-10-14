import SerialMonitor from "./serial";

import { yaksok } from "../yaksok.ts/index";
import { StringValue } from "../yaksok.ts/node";

const serial = new SerialMonitor();
serial.onSuccess = () => {
  console.log("Serial port opened");
  run();
};

serial.onFail = () => {
  console.error("Serial port failed");
};

serial.onReceive = (data) => {
  console.log(data);
};

document.getElementById("connect")?.addEventListener("click", async () => {
  serial.requestPort().then((result) => {
    console.log(result);
  });
});

function run() {
  console.log(document.getElementById("code")?.value);
  yaksok(
    {
      main: document.getElementById("code")?.value,
      아두이노: `번역(arduino), (payload)라고 시리얼 송신하기
***
{
  "type": "serial_write"
}
***`,
    },
    {
      runFFI(runtime, code, args) {
        if (runtime === "arduino") {
          const action = JSON.parse(code) as {
            type: string;
            args: unknown[];
          };

          if (action.type === "serial_write") {
            const payload = args.payload.value;
            serial.send(payload);

            return new StringValue("Succeed");
          }

          return 0;
        }
      },
    }
  );
}
