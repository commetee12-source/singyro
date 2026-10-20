import assert from "node:assert/strict";
import test from "node:test";
import {
  getAccessSteps,
  parseAccessProgress,
  confirmAccessStep,
} from "../src/edufine-access.ts";

test("외부 접속은 승인과 VPN 연결을 거친 다음 업무포털로 이동한다", () => {
  const remote = getAccessSteps("remote").map((step) => step.id);
  assert.ok(remote.indexOf("approval") < remote.indexOf("evpn"));
  assert.ok(remote.indexOf("evpn") < remote.indexOf("vpn"));
  assert.ok(remote.indexOf("vpn") < remote.indexOf("portal"));
  assert.equal(
    getAccessSteps("office").some((step) => step.id === "vpn"),
    false,
  );
});

test("손상되거나 이전 형식인 저장 데이터로 페이지가 중단되지 않는다", () => {
  for (const raw of [null, "", "{", "null", "[]", "true", '{"version":0}']) {
    const state = parseAccessProgress(raw);
    assert.equal(state.mode, "office");
    assert.deepEqual(state.completed, { office: [], remote: [] });
  }
});

test("모르는 단계, 중복, 잘못된 자료형은 제외하고 유효한 진도만 복원한다", () => {
  const state = parseAccessProgress(
    JSON.stringify({
      version: 1,
      mode: "remote",
      completed: {
        office: ["ready", "ready", "vpn", 5, "removed"],
        remote: ["vpn", "portal"],
      },
    }),
  );
  assert.equal(state.mode, "remote");
  assert.deepEqual(state.completed.office, ["ready"]);
  assert.deepEqual(state.completed.remote, ["vpn", "portal"]);
  assert.deepEqual(
    parseAccessProgress('{"version":1,"completed":null}').completed.remote,
    [],
  );
});

test("근무지와 외부 접속 진도는 분리되고 확인 취소도 반영된다", () => {
  const original = parseAccessProgress(null);
  const first = confirmAccessStep(original, "office", "portal", true);
  const repeated = confirmAccessStep(first, "office", "portal", true);
  assert.deepEqual(repeated.completed.office, ["portal"]);
  assert.deepEqual(repeated.completed.remote, []);
  assert.deepEqual(original.completed.office, []);
  assert.deepEqual(
    confirmAccessStep(repeated, "office", "portal", false).completed.office,
    [],
  );
  assert.deepEqual(confirmAccessStep(first, "office", "vpn", true), first);
  assert.deepEqual(parseAccessProgress(JSON.stringify(first)), first);
});
