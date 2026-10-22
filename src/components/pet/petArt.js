// 每種寵物「怎麼畫」的統一介面：身體多大、左右邊緣在哪、各種表情、躺姿、道具。
// 刺蝟和兔子用新的大圖（22×21），小團子沿用原本的 16×16。
// 液晶引擎和活動只透過這裡拿尺寸，不再寫死 16。
import { SPECIES as SMALL, PROPS, petFace } from "./sprites";
import { BIG_SPECIES, BIG_EYES, BIG_MOUTHS, LIE_FACES, BIG_PROPS } from "./bigSprites";

const extent = (pts) => {
  let left = Infinity;
  let right = -Infinity;
  pts.forEach(([x]) => {
    left = Math.min(left, x);
    right = Math.max(right, x);
  });
  return { left, right };
};

// 小團子沒有新表情，用最接近的代替
const SMALL_EYES = { angry: "sad", surprised: "open", cute: "happy" };
const SMALL_MOUTHS = { small: "neutral", sing: "open", wobble: "sad", pout: "sad", oh: "open" };
const BIG_MOUTH_ALIAS = { neutral: "small", sad: "wobble" };

const cache = {};
export function petArt(species) {
  if (cache[species]) return cache[species];
  const big = BIG_SPECIES[species];
  let art;
  if (big) {
    art = {
      big: true,
      w: big.stand.w,
      h: big.stand.h,
      body: big.stand.pts,
      ...extent(big.stand.pts),
      // 「難過」的眼睛本身就有眼淚，不用另外加
      face: (eyes, mouth) => [...(BIG_EYES[eyes] || BIG_EYES.open), ...(BIG_MOUTHS[BIG_MOUTH_ALIAS[mouth] || mouth] || [])],
      lie: big.lie,
      lieFace: (kind) => LIE_FACES[kind] || [],
      sleepsLying: true, // 睡覺是趴著睡
      curl: big.curl,
      egg: SMALL[species].egg,
      ball: BIG_PROPS.beachBall,
      ballArc: [-3, -6, -8, -8, -6, -3, 0],
    };
  } else {
    const sp = SMALL[species] || SMALL.dango;
    art = {
      big: false,
      w: 16,
      h: 16,
      body: sp.body.pts,
      ...extent(sp.body.pts),
      face: (eyes, mouth, tear) => petFace(sp, SMALL_EYES[eyes] || eyes, SMALL_MOUTHS[mouth] || mouth, tear),
      lie: sp.lying,
      lieFace: (kind) => (kind === "sad" ? [[4, sp.lying.h - 3], [4, sp.lying.h - 2]] : []),
      sleepsLying: false,
      curl: null,
      egg: sp.egg,
      ball: PROPS.ball,
      ballArc: [-2, -4, -5, -5, -4, -2, 0],
    };
  }
  cache[species] = art;
  return art;
}

export { BIG_PROPS };
