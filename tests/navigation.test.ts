import test from "node:test";
import assert from "node:assert/strict";
import { sitePath } from "../lib/navigation";
test("all static route links include build-time base path and IDs stay client-local", () => {
  for (const route of ["/", "/cast/", "/records/", "/record/?id=example"]) {
    assert.equal(sitePath(route, ""), route);
    assert.equal(sitePath(route, "/yi"), "/yi" + route);
  }
  assert.throws(() => sitePath("//example.com"));
  assert.throws(() => sitePath("https://example.com"));
});
