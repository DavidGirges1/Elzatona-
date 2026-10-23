import { describe, expect, it } from "vitest";
import { youtubeVideo, nextVote } from "../src/lib/material-preview";
describe("safe YouTube previews", () => {
  it.each([
    "https://youtu.be/sO6VGgBHppo",
    "https://www.youtube.com/watch?v=sO6VGgBHppo&list=unrelated",
    "https://m.youtube.com/shorts/sO6VGgBHppo",
    "https://www.youtube.com/live/sO6VGgBHppo",
    "https://www.youtube-nocookie.com/embed/sO6VGgBHppo",
  ])("recognizes the video in %s without embedding playlists", (url) => {
    expect(youtubeVideo(url)).toEqual({ id: "sO6VGgBHppo", start: 0 });
  });
  it.each([
    null,
    "bad",
    "http://youtu.be/sO6VGgBHppo",
    "https://youtube.com.evil.test/watch?v=sO6VGgBHppo",
    "https://evil.test/youtube.com/watch?v=sO6VGgBHppo",
    "https://youtube.com/playlist?list=sO6VGgBHppo",
    "https://youtu.be/invalid",
    "https://user@youtube.com/watch?v=sO6VGgBHppo",
    "https://youtube.com:444/watch?v=sO6VGgBHppo",
  ])("rejects untrusted or non-video URL %s", (url) =>
    expect(youtubeVideo(url)).toBeNull(),
  );
  it("preserves a bounded shared timestamp", () => {
    expect(youtubeVideo("https://youtu.be/sO6VGgBHppo?t=1h2m3s")?.start).toBe(
      3723,
    );
    expect(youtubeVideo("https://youtu.be/sO6VGgBHppo?t=120")?.start).toBe(120);
    expect(
      youtubeVideo("https://youtu.be/sO6VGgBHppo?t=999999999999")?.start,
    ).toBe(86400);
  });
});
describe("vote feedback", () => {
  it("adds, retracts and changes votes with correct net score", () => {
    expect(nextVote(4, 0, 1)).toEqual({ score: 5, value: 1 });
    expect(nextVote(4, 1, 1)).toEqual({ score: 3, value: 0 });
    expect(nextVote(4, 1, -1)).toEqual({ score: 2, value: -1 });
    expect(nextVote(-1, -1, 1)).toEqual({ score: 1, value: 1 });
  });
});
