import { usePiniaHelper } from "@/utils/piniaHelper";
const configHelper = usePiniaHelper("config");

/**
 * 获取最新的配置（每次调用都重新获取，确保配置是最新的）
 * @returns {Object} 包含 GitHub/NPM 配置的对象
 */
async function getLatestConfig() {
  try {
    // 从 pinia 获取配置（注意字段名：和设置页面保持一致，是 VITE_ 前缀）
    const config = (await configHelper.get("getConfigInfo")) || {};
    // 映射字段（兼容两种字段名，避免取值失败）
    return {
      githubUsername:
        config.githubUsername || config.VITE_GITHUB_USERNAME || "",
      githubToken: config.githubToken || config.VITE_GITHUB_TOKEN || "",
      npmUsername: config.npmUsername || config.VITE_NPM_USERNAME || "",
      renderApiToken: config.renderApiToken || config.VITE_RENDER_API_TOKEN || "",
    };
  } catch (error) {
    console.error("获取配置失败:", error);
    return {
      githubUsername: "",
      githubToken: "",
      npmUsername: "",
      renderApiToken: "",
    };
  }
}

export default getLatestConfig;
