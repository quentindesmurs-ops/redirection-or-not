import { useState } from "react";

const COLORS = ["#2B6CB0", "#0F9B8E"];

const VERDICT_COLOR = {
  keep: "#0F9B8E",
  watch: "#D69E2E",
  redirect: "#C1440E",
};

function formatNumber(n) {
  return Math.round(n).toLocaleString("fr-FR");
}

function defaultEnd() {
  const d = new Date();
  d.setDate(d.getDate() - 3);
  return d.toISOString().slice(0, 10);
}

function defaultStart() {
  const d = new Date();
  d.setDate(d.getDate() - 31);
  return d.toISOString().slice(0, 10);
}

function bestIndex(results, key, lowerIsBetter = false) {
  if (results.length < 2) return -1;
  const values = results.map((r) => r[key]);
  const best = lowerIsBetter ? Math.min(...values) : Math.max(...values);
  if (values.every((v) => v === values[0])) return -1;
  return values.indexOf(best);
}

function VerdictIcon({ verdict, direction }) {
  const color = VERDICT_COLOR[verdict];
  if (verdict === "keep") {
    return (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    );
  }
  if (verdict === "watch") {
    return (
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.3" strokeLinecap="round"
