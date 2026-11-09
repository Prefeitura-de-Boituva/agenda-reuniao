import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `standalone` é exigido só pelo Dockerfile, que copia `.next/standalone` para
  // a imagem final. Na Vercel o adapter monta o próprio bundle e o modo apenas
  // duplicaria o rastreio de arquivos; `DOCKER_BUILD=1` é definido no build da imagem.
  ...(process.env.DOCKER_BUILD === "1" ? { output: "standalone" } : {}),
  outputFileTracingIncludes: {
    "/*": ["src/prisma/*.json"],
  },
};

export default nextConfig;
