// Export the owner's three-circle dotLottie data as native SVG motion.
// This is deliberately limited to this inspected asset, not a general Lottie player.
import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
const source = new URL(
  "../src/components/loading/animation.json",
  import.meta.url,
);
const data = JSON.parse(readFileSync(source, "utf8"));
assert.equal(data.layers.length, 3);
assert.equal(data.assets.length, 0);
const point = (a) => a.slice(0, 2);
const add = (a, b) => a.map((v, i) => v + b[i]);
function length([a, b, c, d]) {
  let result = 0,
    last = a;
  for (let i = 1; i <= 1000; i++) {
    const t = i / 1000,
      u = 1 - t;
    const next = a.map(
      (v, j) =>
        u ** 3 * v +
        3 * u ** 2 * t * b[j] +
        3 * u * t ** 2 * c[j] +
        t ** 3 * d[j],
    );
    result += Math.hypot(...next.map((v, j) => v - last[j]));
    last = next;
  }
  return result;
}
const layers = [...data.layers].reverse().map((layer) => {
  assert.equal(layer.ty, 4);
  assert.equal(layer.bm, 3);
  const [ellipse, fill] = layer.shapes[0].it;
  assert.equal(ellipse.ty, "el");
  assert.equal(fill.ty, "fl");
  assert.equal(ellipse.s.k[0], ellipse.s.k[1]);
  const keys = layer.ks.p.k;
  const segments = keys.slice(0, -1).map((key, i) => {
    const a = point(key.s),
      d = point(keys[i + 1].s);
    return [a, add(a, point(key.to)), add(d, point(key.ti)), d];
  });
  const lengths = segments.map(length),
    total = lengths.reduce((a, b) => a + b, 0);
  const cumulative = [0];
  for (const size of lengths) cumulative.push(cumulative.at(-1) + size / total);
  cumulative[cumulative.length - 1] = 1;
  return {
    start: point(keys[0].s).join(" "),
    path:
      `M ${point(keys[0].s).join(" ")} ` +
      segments.map((s) => "C " + s.slice(1).flat().join(" ")).join(" "),
    keyPoints: cumulative.join(";"),
    keyTimes: keys.map((k) => (k.t - data.ip) / (data.op - data.ip)).join(";"),
    keySplines: keys
      .slice(0, -1)
      .map((k) => [k.o.x, k.o.y, k.i.x, k.i.y].join(" "))
      .join(";"),
    transform: `rotate(${layer.ks.r.k}) translate(${point(layer.ks.a.k)
      .map((v) => -v)
      .join(" ")})`,
    radius: ellipse.s.k[0] / 2,
    fill: `rgb(${fill.c.k
      .slice(0, 3)
      .map((v) => Math.round(v * 255))
      .join(",")})`,
  };
});
const css = layers
  .map(
    (layer, i) =>
      `@keyframes ez-loading-orbit-${i}{${layer.keyTimes
        .split(";")
        .map(
          (time, j) =>
            `${Number(time) * 100}%{offset-distance:${Number(layer.keyPoints.split(";")[j]) * 100}%}`,
        )
        .join("")}}`,
  )
  .join("\n");
writeFileSync(
  new URL("../src/components/loading/motion.json", import.meta.url),
  JSON.stringify(
    {
      viewBox: `0 0 ${data.w} ${data.h}`,
      duration: `${(data.op - data.ip) / data.fr}s`,
      css,
      layers,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "Exported original paths, easing and 2-second timing; no animation runtime required.",
);
