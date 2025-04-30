"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import styles from "./GlitchBackground.module.css";

/**
 * MultiImageBackground loads two images and displays them in a repeating vertical pattern:
 *   bg-1 -> bg-2 -> bg-1 -> bg-2 -> ...
 * Each tile is scaled to fill the entire viewport width, preserving its aspect ratio.
 * No further vertical compression is applied; we just repeat the images enough times
 * to cover the entire scroll height.
 */
class MultiImageBackground {
  private textures: THREE.Texture[] = [];
  private uniforms: any;
  public obj: THREE.Mesh | null = null;

  constructor() {
    this.uniforms = {
      resolution: {
        type: "v2",
        value: new THREE.Vector2(window.innerWidth, document.body.scrollHeight),
      },
      // We'll store the images' natural resolution. (Assume both images share roughly same size.)
      imageResolution: { type: "v2", value: new THREE.Vector2(2048, 1356) },
      texture1: { type: "t", value: null },
      texture2: { type: "t", value: null },
    };
  }

  /**
   * Load the images and set up the fragment shader once they're both ready.
   */
  init(imageUrls: string[], callback: () => void) {
    if (imageUrls.length < 2) {
      console.error("Need at least two images to alternate.");
      callback();
      return;
    }
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = "*";

    const loadPromises = imageUrls.slice(0, 2).map((url) => {
      return new Promise<THREE.Texture>((resolve, reject) => {
        loader.load(
          url,
          (tex) => {
            tex.magFilter = THREE.NearestFilter;
            tex.minFilter = THREE.NearestFilter;
            resolve(tex);
          },
          undefined,
          (err) => reject(err)
        );
      });
    });

    Promise.all(loadPromises)
      .then(([t1, t2]) => {
        this.textures = [t1, t2];
        this.uniforms.texture1.value = t1;
        this.uniforms.texture2.value = t2;
        this.obj = this.createObj();
        callback();
      })
      .catch((err) => {
        console.error("Error loading textures:", err);
        callback();
      });
  }

  /**
   * Create the background plane with a custom fragment shader
   * that does repeating tiles to fill the entire page height,
   * preserving each image tile's aspect ratio.
   */
  createObj() {
    return new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2), // full-screen quad with OrthographicCamera
      new THREE.RawShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: `attribute vec3 position;
        attribute vec2 uv;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }`,
        fragmentShader: `precision highp float;

        uniform vec2 resolution;
        uniform vec2 imageResolution;
        uniform sampler2D texture1;
        uniform sampler2D texture2;

        varying vec2 vUv;

        void main() {
          // The images have a "native" width/height: imageResolution (e.g. 2048 x 1356).
          // We want to scale each image so it fits the *current* window width exactly,
          // preserving aspect ratio. That means scaleFactor = viewportWidth / imageWidth.
          float scaleFactor = resolution.x / imageResolution.x;
          // So each tile's height in px is:
          float tileHeight = scaleFactor * imageResolution.y;

          // We figure out how many such tiles fit in the entire page height:
          float totalTiles = resolution.y / tileHeight;

          // scaledY tells us which tile row we're in:
          float scaledY = vUv.y * totalTiles;
          float tileIndex = floor(scaledY);
          float localY = fract(scaledY);

          // We alternate textures. Even tileIndex => texture1, odd => texture2
          float oddOrEven = mod(tileIndex, 2.0);

          // We'll do localX in [0..1], localY in [0..1] for sampling the image texture.
          // The X coordinate: we know we scaled the image to match full screen width,
          // so vUv.x in [0..1] => we want to sample the entire image from 0..1 in X.
          // That means sampleUv.x = vUv.x. But if the viewport is narrower or wider than
          // the image, we've effectively scaled it. The ratio is imageResolution.x -> resolution.x
          // So we can do direct mapping:
          float sampleX = vUv.x;
          // The Y coordinate is localY in [0..1] to sample the entire height of the texture
          float sampleY = localY;

          vec2 sampleUv = vec2(sampleX, sampleY);

          // sample each texture:
          vec4 c1 = texture2D(texture1, sampleUv);
          vec4 c2 = texture2D(texture2, sampleUv);

          // final color: pick c1 if tileIndex is even, c2 if odd
          vec4 finalColor = mix(c1, c2, step(0.5, oddOrEven));
          gl_FragColor = finalColor;
        }
      `,
      })
    );
  }

  resize() {
    // Update the resolution uniform to handle changes in window width or page height
    this.uniforms.resolution.value.set(
      window.innerWidth,
      document.body.scrollHeight
    );
  }

  // Public method to dispose textures
  dispose() {
    this.textures.forEach((tex) => tex.dispose());
  }
}

/**
 * The glitch post-effect remains mostly unchanged, just referencing the final texture.
 */
class PostEffect {
  uniforms: any;
  obj: THREE.Mesh;

  constructor(texture: THREE.Texture) {
    this.uniforms = {
      time: { type: "f", value: 0 },
      resolution: {
        type: "v2",
        value: new THREE.Vector2(window.innerWidth, document.body.scrollHeight),
      },
      texture: { type: "t", value: texture },
    };
    this.obj = this.createObj();
  }

  createObj() {
    return new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.RawShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: `attribute vec3 position;
        attribute vec2 uv;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }`,
        fragmentShader: `precision highp float;
          uniform float time;
          uniform vec2 resolution;
          uniform sampler2D texture;
          varying vec2 vUv;

          float random(vec2 c){
            return fract(sin(dot(c.xy ,vec2(12.9898,78.233))) * 43758.5453);
          }

          // 3D simplex noise
          vec3 mod289(vec3 x) {
            return x - floor(x * (1.0 / 289.0)) * 289.0;
          }
          vec4 mod289(vec4 x) {
            return x - floor(x * (1.0 / 289.0)) * 289.0;
          }
          vec4 permute(vec4 x) {
            return mod289(((x*34.0)+1.0)*x);
          }
          vec4 taylorInvSqrt(vec4 r) {
            return 1.79284291400159 - 0.85373472095314 * r;
          }
          float snoise3(vec3 v) {
            const vec2 C = vec2(1.0/6.0, 1.0/3.0);
            const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

            vec3 i = floor(v + dot(v, C.yyy));
            vec3 x0 = v - i + dot(i, C.xxx);

            vec3 g = step(x0.yzx, x0.xyz);
            vec3 l = 1.0 - g;
            vec3 i1 = min(g.xyz, l.zxy);
            vec3 i2 = max(g.xyz, l.zxy);

            vec3 x1 = x0 - i1 + C.xxx;
            vec3 x2 = x0 - i2 + C.yyy;
            vec3 x3 = x0 - D.yyy;

            i = mod289(i);
            vec4 p = permute(
                      permute(
                       permute(
                        i.z + vec4(0.0, i1.z, i2.z, 1.0 )
                       )
                       + i.y + vec4(0.0, i1.y, i2.y, 1.0 )
                      )
                      + i.x + vec4(0.0, i1.x, i2.x, 1.0 )
                    );

            float n_ = 0.142857142857;
            vec3 ns = n_ * D.wyz - D.xzx;

            vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

            vec4 x_ = floor(j * ns.z);
            vec4 y_ = floor(j - 7.0 * x_);

            vec4 x = x_ * ns.x + ns.yyyy;
            vec4 y = y_ * ns.x + ns.yyyy;
            vec4 h = 1.0 - abs(x) - abs(y);

            vec4 b0 = vec4(x.xy, y.xy);
            vec4 b1 = vec4(x.zw, y.zw);

            vec4 s0 = floor(b0)*2.0 + 1.0;
            vec4 s1 = floor(b1)*2.0 + 1.0;
            vec4 sh = -step(h, vec4(0.0));

            vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
            vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

            vec3 p0 = vec3(a0.xy, h.x);
            vec3 p1 = vec3(a0.zw, h.y);
            vec3 p2 = vec3(a1.xy, h.z);
            vec3 p3 = vec3(a1.zw, h.w);

            vec4 norm = taylorInvSqrt(vec4(
              dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)
            ));
            p0 *= norm.x;
            p1 *= norm.y;
            p2 *= norm.z;
            p3 *= norm.w;

            vec4 m = max(
              0.6 - vec4(
                dot(x0,x0),
                dot(x1,x1),
                dot(x2,x2),
                dot(x3,x3)
              ), 0.0
            );
            m = m*m;
            return 42.0 * dot(m*m, vec4(
              dot(p0,x0),
              dot(p1,x1),
              dot(p2,x2),
              dot(p3,x3)
            ));
          }

          const float interval = 3.0;

          void main() {
            float strength = smoothstep(interval * 0.5, interval, interval - mod(time, interval));

            float y = vUv.y * resolution.y;
            float rgbWave = (
              snoise3(vec3(0.0, y * 0.01, time * 400.0)) * 2.0
              * snoise3(vec3(0.0, y * 0.02, time * 200.0)) * 1.0
            ) / resolution.x;

            float rgbDiff = (6.0 + sin(time * 500.0 + vUv.y * 40.0)) / resolution.x;
            float rgbUvX = vUv.x + rgbWave;
            float r = texture2D(texture, vec2(rgbUvX + rgbDiff, vUv.y)).r;
            float g = texture2D(texture, vec2(rgbUvX, vUv.y)).g;
            float b = texture2D(texture, vec2(rgbUvX - rgbDiff, vUv.y)).b;

            float whiteNoise = (random(vUv + mod(time, 10.0)) * 2.0 - 1.0) * 0.03;

            float bnTime = floor(time * 20.0) * 200.0;
            float noiseX = step((snoise3(vec3(0.0, vUv.x * 3.0, bnTime)) + 1.0)/2.0, 0.12);
            float noiseY = step((snoise3(vec3(0.0, vUv.y * 3.0, bnTime)) + 1.0)/2.0, 0.12);
            float bnMask = noiseX * noiseY;
            float bnUvX = vUv.x + rgbWave;
            float bnR = texture2D(texture, vec2(bnUvX + rgbDiff, vUv.y)).r * bnMask;
            float bnG = texture2D(texture, vec2(bnUvX, vUv.y)).g * bnMask;
            float bnB = texture2D(texture, vec2(bnUvX - rgbDiff, vUv.y)).b * bnMask;
            vec4 blockNoise = vec4(bnR, bnG, bnB, 1.0);

            float bnTime2 = floor(time * 25.0) * 300.0;
            float noiseX2 = step((snoise3(vec3(0.0, vUv.x * 2.0, bnTime2)) + 1.0)/2.0, 0.12);
            float noiseY2 = step((snoise3(vec3(0.0, vUv.y * 8.0, bnTime2)) + 1.0)/2.0, 0.12);
            float bnMask2 = noiseX2 * noiseY2;
            float bnR2 = texture2D(texture, vec2(bnUvX + rgbDiff, vUv.y)).r * bnMask2;
            float bnG2 = texture2D(texture, vec2(bnUvX, vUv.y)).g * bnMask2;
            float bnB2 = texture2D(texture, vec2(bnUvX - rgbDiff, vUv.y)).b * bnMask2;
            vec4 blockNoise2 = vec4(bnR2, bnG2, bnB2, 1.0);

            gl_FragColor = vec4(r,g,b,1.0)*(1.0 - bnMask - bnMask2)
              + (whiteNoise + blockNoise + blockNoise2);
          }
        `,
      })
    );
  }

  render(time: number) {
    this.uniforms.time.value += time;
  }

  resize() {
    this.uniforms.resolution.value.set(
      window.innerWidth,
      document.body.scrollHeight
    );
  }
}

const debounce = (callback: Function, duration: number) => {
  let timer: NodeJS.Timeout;
  return function (event: any) {
    clearTimeout(timer);
    timer = setTimeout(function () {
      callback(event);
    }, duration);
  };
};

interface GlitchBackgroundProps {
  imageUrls?: string[];
}

/**
 * GlitchBackground:
 *   - Creates a canvas sized to the full page (scrollHeight).
 *   - Renders a background that alternates two images repeatedly down the page,
 *     preserving image aspect ratio (no height compression).
 *   - Applies a glitch post-processing effect for a dynamic look.
 */
export default function GlitchBackground({
  imageUrls = ["/images/bg-1.png", "/images/bg-2.png"],
}: GlitchBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const postEffectRef = useRef<PostEffect | null>(null);
  const animationIdRef = useRef<number>(0); // Ref to store animation frame ID
  const isVisibleRef = useRef<boolean>(true); // Ref to track visibility state

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    // Match canvas size to entire document scroll height
    canvas.style.height = `${document.body.scrollHeight}px`;
    canvas.style.width = "100vw"; // Ensure canvas width matches viewport width

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      canvas: canvas,
    });

    // Our render target for glitch pass
    const renderTarget = new THREE.WebGLRenderTarget(
      window.innerWidth,
      document.body.scrollHeight
    );
    const scene = new THREE.Scene();
    const sceneBack = new THREE.Scene();
    // Orthographic cameras for full-screen quads
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const cameraBack = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const clock = new THREE.Clock();

    const bg = new MultiImageBackground();

    // Called on init + on window resize
    const resizeWindow = () => {
      const w = window.innerWidth;
      const h = document.body.scrollHeight;
      canvas.width = w;
      canvas.height = h;

      renderer.setSize(w, h);
      renderTarget.setSize(w, h);

      bg.resize();
      if (postEffectRef.current) {
        postEffectRef.current.resize();
      }
    };

    const renderFrame = () => {
      const dt = clock.getDelta();

      renderer.setRenderTarget(renderTarget);
      renderer.render(sceneBack, cameraBack);
      renderer.setRenderTarget(null);

      if (postEffectRef.current) {
        postEffectRef.current.render(dt);
      }
      renderer.render(scene, camera);
    };

    // Modified animate function
    const animate = () => {
      if (!isVisibleRef.current) return; // Don't run if page is hidden
      renderFrame();
      animationIdRef.current = requestAnimationFrame(animate); // Store the ID
    };

    const init = () => {
      renderer.setSize(window.innerWidth, document.body.scrollHeight);
      renderer.setClearColor(0x111111, 1.0);

      bg.init(imageUrls, () => {
        if (bg.obj) {
          sceneBack.add(bg.obj);
        }
        // Now create glitch pass referencing background's RT and store in ref
        postEffectRef.current = new PostEffect(renderTarget.texture);
        scene.add(postEffectRef.current.obj);

        resizeWindow();
        // Start animation only if visible
        isVisibleRef.current = !document.hidden;
        if (isVisibleRef.current) {
          animate();
        }
      });
    };

    const onResize = debounce(() => {
      resizeWindow();
    }, 300);

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        isVisibleRef.current = false;
        if (animationIdRef.current) {
          cancelAnimationFrame(animationIdRef.current);
          animationIdRef.current = 0; // Reset ID
        }
      } else {
        isVisibleRef.current = true;
        if (!animationIdRef.current) {
          // Only start if not already running
          clock.start(); // Restart clock if needed after pause
          animate(); // Restart animation loop
        }
      }
    };

    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", handleVisibilityChange); // Add listener

    init();

    return () => {
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", handleVisibilityChange); // Remove listener
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current); // Clean up animation frame on unmount
      }
      // Dispose Three.js resources properly
      if (postEffectRef.current) {
        scene.remove(postEffectRef.current.obj);
        // If the material/geometry are unique, dispose them
        postEffectRef.current.obj.geometry.dispose();
        // Check if material is RawShaderMaterial before disposing
        if (
          postEffectRef.current.obj.material instanceof THREE.RawShaderMaterial
        ) {
          postEffectRef.current.obj.material.dispose();
        }
      }
      if (bg.obj) {
        sceneBack.remove(bg.obj);
        bg.obj.geometry.dispose();
        // Check if material is RawShaderMaterial before disposing
        if (bg.obj.material instanceof THREE.RawShaderMaterial) {
          bg.obj.material.dispose();
        }
      }
      bg.dispose(); // Call the new dispose method
      renderTarget.dispose();
      renderer.dispose();
      postEffectRef.current = null;
    };
  }, [imageUrls]);

  return (
    <>
      <canvas ref={canvasRef} className={styles.canvas} />
    </>
  );
}
