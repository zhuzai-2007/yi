"use client";
import { useEffect, useRef, useState } from "react";
import Link from "./SiteLink";
import type { CastRecord } from "../lib/casting";
import {
  decodeRecords,
  deleteRecord,
  encodeRecords,
  importRecords,
  loadRecords,
} from "../lib/storage";
import {
  changeLine,
  getHexagram,
  getLineTitle,
  getYinYang,
  isMoving,
} from "../lib/iching/core";
import { Localize } from "./Language";
export default function Records() {
  const [records, setRecords] = useState<CastRecord[]>([]),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [deleting, setDeleting] = useState<string | null>(null),
    [pending, setPending] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    function read() {
      try {
        setRecords(loadRecords(localStorage));
        setError("");
      } catch {
        setError("无法读取本地卦例。已有数据未被覆盖。");
      }
      setReady(true);
    }
    read();
    window.addEventListener("storage", read);
    return () => window.removeEventListener("storage", read);
  }, []);
  function exportJson() {
    try {
      const blob = new Blob([encodeRecords(loadRecords(localStorage))], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = `zhouyi-records-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("导出失败，请检查本地记录。");
    }
  }
  async function selectFile(file?: File) {
    setPending(null);
    setNotice("");
    setError("");
    if (!file) return;
    try {
      if (file.size > 10_000_000) throw new Error("导入文件不能超过 10 MB。");
      const json = await file.text();
      const parsed = decodeRecords(json);
      setPending(json);
      setNotice(
        `已校验 ${parsed.length} 条记录。确认导入后合并到本地，相同记录会去重。`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "无法读取 JSON 文件。");
    }
  }
  function commitImport() {
    if (!pending) return;
    try {
      const count = importRecords(localStorage, pending);
      setRecords(loadRecords(localStorage));
      setPending(null);
      setNotice(`已导入 ${count} 条新记录。`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "导入失败，原有记录未被覆盖。");
    }
  }
  return (
    <Localize>
      <section className="intro">
        <div>
          <p className="eyebrow">LOCAL NOTEBOOK</p>
          <h1>卦例</h1>
          <p className="intro-description">
            保留输入，重新计算。每一则都有来处。
          </p>
        </div>
        <Link className="button-link" href="/">
          新建起卦 →
        </Link>
      </section>
      <p className="privacy-note">
        卦例仅保存在当前浏览器中。清除浏览器数据或更换设备可能导致记录丢失。
      </p>
      <div className="records-actions">
        <button className="button-link" disabled={!ready} onClick={exportJson}>
          导出 JSON
        </button>
        <button className="button-link" onClick={() => input.current?.click()}>
          导入 JSON
        </button>
        <input
          className="sr-only"
          ref={input}
          type="file"
          accept=".json,application/json"
          aria-label="选择卦例 JSON 文件"
          onChange={(e) => {
            void selectFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <span className="muted small">导出文件含所问内容，请自行保管。</span>
      </div>
      {notice && (
        <div className="notice" role="status">
          <p>{notice}</p>
          {pending && (
            <div className="action-row">
              <button className="button-link" onClick={commitImport}>
                确认导入
              </button>
              <button
                onClick={() => {
                  setPending(null);
                  setNotice("");
                }}
              >
                取消
              </button>
            </div>
          )}
        </div>
      )}
      <p role="alert" className="error">
        {error}
      </p>
      {!ready ? (
        <p>正在读取本地卦例…</p>
      ) : !records.length && !error ? (
        <div className="empty-state">
          <h2>尚无卦例</h2>
          <p>完成六次投掷或直接输入后，记录会出现在这里。</p>
          <Link href="/">开始第一则记录 →</Link>
        </div>
      ) : (
        <div className="record-list">
          {records.map((record) => {
            const bits = record.lines.map(getYinYang),
              base = getHexagram(bits),
              next = getHexagram(record.lines.map(changeLine)),
              moving = record.lines.flatMap((v, i) =>
                isMoving(v) ? [getLineTitle(bits[i], i)] : [],
              );
            return (
              <article className="record-card" key={record.id}>
                <Link
                  className="record-open"
                  href={`/record/?id=${encodeURIComponent(record.id)}`}
                >
                  <p className="muted small">
                    <time dateTime={record.createdAt}>
                      {record.createdAt.replace("T", " ")}
                    </time>{" "}
                    · {record.method === "manual" ? "直接输入" : "三钱法"}
                  </p>
                  <h2>
                    {record.question ? (
                      <span data-verbatim>{record.question}</span>
                    ) : (
                      "未填写所问"
                    )}
                  </h2>
                  <p>
                    {base.fullName} {base.unicode} → {next.fullName}{" "}
                    {next.unicode}
                  </p>
                  <p className="muted small">
                    {moving.length ? moving.join("、") + "动" : "无动爻"}
                  </p>
                </Link>
                <div className="delete-controls">
                  {deleting === record.id ? (
                    <>
                      <span>删除后无法撤销。</span>
                      <button
                        onClick={() => {
                          try {
                            deleteRecord(localStorage, record.id);
                            setRecords(loadRecords(localStorage));
                            setDeleting(null);
                          } catch {
                            setError("删除失败，未改变当前显示的记录。");
                          }
                        }}
                      >
                        确认删除
                      </button>
                      <button onClick={() => setDeleting(null)}>取消</button>
                    </>
                  ) : (
                    <button
                      aria-label="删除此卦例"
                      onClick={() => setDeleting(record.id)}
                    >
                      删除
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </Localize>
  );
}
