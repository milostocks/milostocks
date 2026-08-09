import Image from "next/image";

import aaplImg from "./animated/aapl.png";
import coinImg from "./animated/coin.png";
import gmeImg from "./animated/gme.png";
import googlImg from "./animated/googl.png";
import msftImg from "./animated/msft.png";
import nvdaImg from "./animated/nvda.png";
import pltrImg from "./animated/pltr.png";
import spcxImg from "./animated/spcx.png";
import tslaImg from "./animated/tsla.png";
import miloImg from "./animated/milo.png";

const animatedIcons = [
  { name: "AAPL", src: aaplImg },
  { name: "COIN", src: coinImg },
  { name: "GME", src: gmeImg },
  { name: "GOOGL", src: googlImg },
  { name: "MSFT", src: msftImg },
  { name: "NVDA", src: nvdaImg },
  { name: "PLTR", src: pltrImg },
  { name: "SPCX", src: spcxImg },
  { name: "TSLA", src: tslaImg },
];

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#060a03]/95 backdrop-blur-xl overflow-hidden">
      
      <div className="relative flex h-[400px] w-[400px] items-center justify-center">
        
        {/* The center logo */}
        <div className="relative flex h-36 w-36 items-center justify-center z-20">
          <div className="absolute inset-0 animate-ping rounded-full border border-[#ccff00]/40" style={{ animationDuration: '2s' }} />
          <div className="absolute inset-4 animate-pulse rounded-full bg-[#ccff00]/20 shadow-[0_0_40px_rgba(204,255,0,0.6)]" />
          <Image src={miloImg} alt="MILO Logo" className="z-10 h-28 w-28 drop-shadow-[0_0_20px_rgba(204,255,0,0.8)] object-contain" />
        </div>

        {/* Orbiting Icons */}
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: '18s', animationTimingFunction: 'linear' }}>
          {animatedIcons.map((stock, i) => {
            const angle = (i / animatedIcons.length) * 360;
            return (
              <div 
                key={stock.name}
                className="absolute left-1/2 top-1/2 h-16 w-16 -ml-8 -mt-8 flex items-center justify-center"
                style={{
                  transform: `rotate(${angle}deg) translateY(-160px)`,
                }}
              >
                {/* Counter-spin so the logo doesn't upside down */}
                <Image
                  src={stock.src} 
                  alt={stock.name}
                  className="h-full w-full rounded-full shadow-[0_0_20px_rgba(204,255,0,0.3)]"
                  style={{ animation: 'spin 18s linear infinite reverse' }}
                />
              </div>
            );
          })}
        </div>

      </div>



    </div>
  );
}
