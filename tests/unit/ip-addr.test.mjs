import { describe, it, expect } from "vitest";
import {
  isIPv4,
  isIPv6,
  isIP,
  ipv4ToInt,
  intToIPv4,
  isPrivateIPv4,
} from "../../src/utils/ip-addr.js";

describe("isIPv4", () => {
  it("accepts valid", () => {
    expect(isIPv4("0.0.0.0")).toBe(true);
    expect(isIPv4("192.168.1.1")).toBe(true);
    expect(isIPv4("255.255.255.255")).toBe(true);
  });

  it("rejects out of range", () => {
    expect(isIPv4("256.0.0.0")).toBe(false);
    expect(isIPv4("1.2.3")).toBe(false);
    expect(isIPv4("a.b.c.d")).toBe(false);
  });

  it("rejects leading zeros", () => {
    expect(isIPv4("01.2.3.4")).toBe(false);
  });
});

describe("isIPv6", () => {
  it("accepts canonical", () => {
    expect(isIPv6("2001:db8::1")).toBe(true);
    expect(isIPv6("::1")).toBe(true);
    expect(isIPv6("::")).toBe(true);
    expect(isIPv6("fe80::1234:5678:9abc:def0")).toBe(true);
  });

  it("accepts IPv4-mapped", () => {
    expect(isIPv6("::ffff:192.168.1.1")).toBe(true);
  });

  it("rejects garbage", () => {
    expect(isIPv6("2001:::1")).toBe(false);
    expect(isIPv6("1.2.3.4")).toBe(false);
    expect(isIPv6("xyz::1")).toBe(false);
  });
});

describe("isIP", () => {
  it("union of v4 and v6", () => {
    expect(isIP("1.2.3.4")).toBe(true);
    expect(isIP("::1")).toBe(true);
    expect(isIP("nope")).toBe(false);
  });
});

describe("ipv4ToInt / intToIPv4", () => {
  it("round trips", () => {
    expect(ipv4ToInt("0.0.0.0")).toBe(0);
    expect(ipv4ToInt("255.255.255.255")).toBe(0xffffffff);
    expect(intToIPv4(0xc0a80101)).toBe("192.168.1.1");
    expect(ipv4ToInt(intToIPv4(123456789))).toBe(123456789);
  });

  it("ipv4ToInt returns null on bad input", () => {
    expect(ipv4ToInt("nope")).toBe(null);
  });

  it("intToIPv4 throws out of range", () => {
    expect(() => intToIPv4(-1)).toThrow();
    expect(() => intToIPv4(0x1_0000_0000)).toThrow();
  });
});

describe("isPrivateIPv4", () => {
  it("identifies RFC1918 + loopback", () => {
    expect(isPrivateIPv4("10.0.0.1")).toBe(true);
    expect(isPrivateIPv4("172.16.0.1")).toBe(true);
    expect(isPrivateIPv4("172.31.255.255")).toBe(true);
    expect(isPrivateIPv4("172.32.0.1")).toBe(false);
    expect(isPrivateIPv4("192.168.1.1")).toBe(true);
    expect(isPrivateIPv4("127.0.0.1")).toBe(true);
    expect(isPrivateIPv4("8.8.8.8")).toBe(false);
  });
});
