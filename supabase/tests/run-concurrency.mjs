import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const directory = fileURLToPath(new URL(".", import.meta.url));
const executable = process.env.PSQL || "psql";

function run(argumentsList, applicationName = "apex-db-acceptance") {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, ["-X", "-v", "ON_ERROR_STOP=1", ...argumentsList], {
      cwd: directory,
      env: { ...process.env, PGAPPNAME: applicationName },
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.on("data", (chunk) => {
      output += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, output }));
  });
}

function assertSuccess(result, label) {
  if (result.code !== 0) throw new Error(label + "\n" + result.output);
}

function checkout(variant, request, coupon = "", user = 1, hold = 0) {
  return [
    "-f",
    "concurrency-checkout.sql",
    "-v",
    "user_id=c0000000-0000-4000-8000-00000000000" + user,
    "-v",
    "variant_id=c0000000-0000-4000-8000-00000000030" + variant,
    "-v",
    "request_id=c0000000-0000-4000-8000-00000000050" + request,
    "-v",
    "coupon_code=" + coupon,
    "-v",
    "expected_total=" + (coupon ? 480000 : 530000),
    "-v",
    "hold_seconds=" + hold,
  ];
}

async function race(label, holderArguments, contenderArguments, expectedError) {
  const holder = run(holderArguments, "apex-db-race-holder");
  let holding = false;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const probe = await run([
      "-Atc",
      "select count(*) from pg_stat_activity where application_name = 'apex-db-race-holder' and wait_event = 'PgSleep'",
    ]);
    assertSuccess(probe, "Inspect lock holder");
    if (probe.output.trim() === "1") {
      holding = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  if (!holding) {
    const result = await holder;
    throw new Error("Holder never reached transaction delay: " + label + "\n" + result.output);
  }
  const contender = run(contenderArguments, "apex-db-race-contender");
  const [holderResult, contenderResult] = await Promise.all([holder, contender]);
  assertSuccess(holderResult, label + " holder");
  if (expectedError) {
    if (contenderResult.code === 0 || !contenderResult.output.includes(expectedError)) {
      throw new Error(
        label + " contender should fail with " + expectedError + "\n" + contenderResult.output,
      );
    }
  } else {
    assertSuccess(contenderResult, label + " contender");
  }
  console.log("PASS: " + label);
}

assertSuccess(await run(["-f", "concurrency-setup.sql"]), "Create disposable race fixtures");
await race(
  "last available unit cannot oversell",
  checkout(1, 1, "", 1, 1),
  checkout(1, 2, "", 2),
  "Insufficient stock",
);
await race(
  "last coupon use with independent variants",
  checkout(2, 2, "RACEONCE", 1, 1),
  checkout(3, 3, "RACEONCE", 2),
  "Coupon is unavailable",
);
await race("same request returns the existing order", checkout(4, 4, "", 1, 1), checkout(4, 4));
await race(
  "same request rejects changed details",
  checkout(4, 4, "", 1, 1),
  checkout(3, 4),
  "different checkout details",
);
await race(
  "cancellation restores inventory once",
  ["-f", "concurrency-cancel.sql", "-v", "hold_seconds=1"],
  ["-f", "concurrency-cancel.sql", "-v", "hold_seconds=0"],
);
await race(
  "concurrent self-demotions preserve the last admin",
  [
    "-f",
    "concurrency-admin.sql",
    "-v",
    "user_id=c0000000-0000-4000-8000-000000000003",
    "-v",
    "hold_seconds=1",
  ],
  [
    "-f",
    "concurrency-admin.sql",
    "-v",
    "user_id=c0000000-0000-4000-8000-000000000004",
    "-v",
    "hold_seconds=0",
  ],
  "last active admin",
);
const verification = await run(["-f", "concurrency-verify.sql"]);
assertSuccess(verification, "Verify race invariants");
console.log(verification.output.trim());
