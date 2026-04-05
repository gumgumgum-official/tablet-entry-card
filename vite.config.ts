import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

function escapeHtmlAttribute(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

/** .env 파일 + Vercel 등 CI의 process.env 둘 다 참고 (빌드 시점 스냅샷용) */
function buildTimeEnv(
  fileEnv: Record<string, string>,
  key: string
): string {
  return fileEnv[key] ?? process.env[key] ?? "";
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, process.cwd(), "");

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      {
        name: "inject-build-pointer-env-meta",
        transformIndexHtml(html) {
          const all = buildTimeEnv(fileEnv, "VITE_ALLOW_ALL_POINTERS");
          const touch = buildTimeEnv(fileEnv, "VITE_ALLOW_TOUCH_AS_PEN");
          const mouse = buildTimeEnv(fileEnv, "VITE_ALLOW_MOUSE");
          const debug = buildTimeEnv(fileEnv, "VITE_DEBUG_POINTER");
          const block = [
            `<meta name="build-vite-mode" content="${escapeHtmlAttribute(mode)}" />`,
            `<meta name="build-VITE_ALLOW_ALL_POINTERS" content="${escapeHtmlAttribute(all)}" />`,
            `<meta name="build-VITE_ALLOW_TOUCH_AS_PEN" content="${escapeHtmlAttribute(touch)}" />`,
            `<meta name="build-VITE_ALLOW_MOUSE" content="${escapeHtmlAttribute(mouse)}" />`,
            `<meta name="build-VITE_DEBUG_POINTER" content="${escapeHtmlAttribute(debug)}" />`,
          ].join("\n    ");
          // 배포 URL에서 페이지 소스 보기로 빌드 시점 ENV가 들어갔는지 확인용
          return html.replace("<head>", `<head>\n    ${block}\n`);
        },
      },
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
