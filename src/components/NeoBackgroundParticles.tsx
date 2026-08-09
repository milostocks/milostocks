"use client";

import { useEffect, useRef, useState } from "react";
import aaplImg from "@/app/animated/aapl.png";
import coinImg from "@/app/animated/coin.png";
import gmeImg from "@/app/animated/gme.png";
import googlImg from "@/app/animated/googl.png";
import msftImg from "@/app/animated/msft.png";
import nvdaImg from "@/app/animated/nvda.png";
import pltrImg from "@/app/animated/pltr.png";
import spcxImg from "@/app/animated/spcx.png";
import tslaImg from "@/app/animated/tsla.png";

interface FloatingCoin {
  id: number;
  ticker: string;
  src: string;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  glowColor: string;
}

const LOCAL_ANIMATED_LOGOS = [
  { ticker: "NVDA", src: nvdaImg.src },
  { ticker: "AAPL", src: aaplImg.src },
  { ticker: "TSLA", src: tslaImg.src },
  { ticker: "GOOGL", src: googlImg.src },
  { ticker: "MSFT", src: msftImg.src },
  { ticker: "COIN", src: coinImg.src },
  { ticker: "GME", src: gmeImg.src },
  { ticker: "PLTR", src: pltrImg.src },
  { ticker: "SPCX", src: spcxImg.src },
];

const COLORS = [
  "#ccff00",
  "#d4ff2a",
  "#e0ff66",
  "#7a9900",
  "#a7f3d0",
  "#22c55e",
];

export default function NeoBackgroundParticles() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [coins, setCoins] = useState<FloatingCoin[]>([]);

  // Generate floating custom animated stock coins
  useEffect(() => {
    const list: FloatingCoin[] = Array.from({ length: 20 }).map((_, i) => {
      const item = LOCAL_ANIMATED_LOGOS[i % LOCAL_ANIMATED_LOGOS.length];
      return {
        id: i,
        ticker: item.ticker,
        src: item.src,
        x: (i * 4.8 + (i * 17) % 25) % 92 + 4,
        y: (i * 8.2 + (i * 13) % 29) % 90 + 5,
        size: Math.floor(42 + (i * 9) % 28),
        duration: 8 + (i % 5) * 2.5,
        delay: (i % 4) * 1.2,
        glowColor: COLORS[i % COLORS.length],
      };
    });
    setCoins(list);
  }, []);

  // Canvas particle constellation network
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Particle nodes
    const count = Math.min(Math.floor((width * height) / 18000), 55);
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
      alpha: number;
    }> = [];

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        radius: Math.random() * 2 + 1,
        color: COLORS[i % COLORS.length],
        alpha: Math.random() * 0.7 + 0.3,
      });
    }

    // Mouse tracking for interactive glow
    let mouseX = width / 2;
    let mouseY = height / 2;
    let mouseActive = false;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      mouseActive = true;
    };
    const handleMouseLeave = () => {
      mouseActive = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw constellation connections
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        p1.x += p1.vx;
        p1.y += p1.vy;

        if (p1.x < 0) p1.x = width;
        if (p1.x > width) p1.x = 0;
        if (p1.y < 0) p1.y = height;
        if (p1.y > height) p1.y = 0;

        // Draw particle node
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, p1.radius, 0, Math.PI * 2);
        ctx.fillStyle = p1.color;
        ctx.globalAlpha = p1.alpha * 0.8;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p1.color;
        ctx.fill();

        // Connect nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 130) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            const lineAlpha = (1 - dist / 130) * 0.25;
            ctx.strokeStyle = p1.color;
            ctx.globalAlpha = lineAlpha;
            ctx.lineWidth = 0.8;
            ctx.shadowBlur = 4;
            ctx.stroke();
          }
        }

        // Mouse connection aura
        if (mouseActive) {
          const mdx = p1.x - mouseX;
          const mdy = p1.y - mouseY;
          const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
          if (mdist < 160) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(mouseX, mouseY);
            ctx.strokeStyle = "#ccff00";
            ctx.globalAlpha = (1 - mdist / 160) * 0.35;
            ctx.lineWidth = 1;
            ctx.shadowBlur = 8;
            ctx.shadowColor = "#ccff00";
            ctx.stroke();
          }
        }
      }

      ctx.globalAlpha = 1;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none">
      {/* Dynamic Animated Ambient Sage & Emerald Orbs */}
      <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-[#ccff00]/18 blur-[120px] animate-pulse" />
      <div className="absolute top-1/3 -right-40 h-[600px] w-[600px] rounded-full bg-[#e0ff66]/16 blur-[140px] animate-pulse [animation-delay:2s]" />
      <div className="absolute -bottom-40 left-1/4 h-[550px] w-[550px] rounded-full bg-[#7a9900]/18 blur-[130px] animate-pulse [animation-delay:4s]" />

      {/* HTML5 Canvas Laser Network */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full opacity-60" />

      {/* Floating Custom Animated Stock Coins */}
      <div className="absolute inset-0 opacity-60">
        {coins.map((c) => (
          <div
            key={c.id}
            className="absolute flex items-center justify-center transition-transform group"
            style={{
              left: `${c.x}%`,
              top: `${c.y}%`,
              width: `${c.size}px`,
              height: `${c.size}px`,
              filter: `drop-shadow(0 0 14px ${c.glowColor})`,
              animation: `neoFloat ${c.duration}s ease-in-out ${c.delay}s infinite alternate`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={c.src}
              alt={c.ticker}
              className="h-full w-full object-contain hover:scale-125 transition-transform duration-300"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
