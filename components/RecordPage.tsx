"use client";
import { useEffect, useState } from "react";
import Link from "./SiteLink";
import type { CastRecord } from "../lib/casting";
import { loadRecords } from "../lib/storage";
import { Localize } from "./Language";
import Reader from "./Reader";
export default function RecordPage() {
  const [record, setRecord] = useState<CastRecord | null>(null),
    [message, setMessage] = useState("正在读取本地卦例…");
  useEffect(() => {
    function read() {
      try {
        const id = new URLSearchParams(window.location.search).get("id");
        const found = loadRecords(localStorage).find((r) => r.id === id);
        setRecord(found || null);
        setMessage(
          found ? "" : "未找到此卦例。记录可能已删除，或保存在另一个浏览器中。",
        );
      } catch {
        setRecord(null);
        setMessage("本地记录无法读取。原有数据未被覆盖。");
      }
    }
    read();
    window.addEventListener("storage", read);
    return () => window.removeEventListener("storage", read);
  }, []);
  return (
    <>
      <Localize>
        <div className="result-toolbar">
          <Link href="/records/">← 本地卦例</Link>
          <Link href="/">新建起卦 →</Link>
        </div>
      </Localize>
      {record ? (
        <Reader key={record.id} record={record} />
      ) : (
        <Localize>
          <p role="status">{message}</p>
        </Localize>
      )}
    </>
  );
}
