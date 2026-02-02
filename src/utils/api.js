import axios from "axios";
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
    };
  } catch (error) {
    console.error("获取配置失败:", error);
    return {
      githubUsername: "",
      githubToken: "",
      npmUsername: "",
    };
  }
}

/**
 * 获取 GitHub 仓库列表（修复版：每次调用都拿最新配置）
 */
export const getGithubRepos = async () => {
  // 第一步：先获取最新配置，确保有值再请求
  const { githubUsername, githubToken } = await getLatestConfig();

  // 第二步：检查配置是否完整，提前拦截错误
  if (!githubUsername || !githubToken) {
    const errorMsg = "GitHub 配置未完善，请先在设置页面填写用户名和 Token";
    console.error(errorMsg);
    return { success: false, message: errorMsg };
  }

  try {
    const res = await axios.get(
      `https://api.github.com/users/${githubUsername}/repos`,
      {
        headers: {
          Authorization: `token ${githubToken}`,
          "User-Agent": githubUsername,
          Accept: "application/vnd.github.v3+json",
        },
        // 可选：添加超时设置，避免请求挂起
        timeout: 10000,
      },
    );
    return { success: true, data: res.data };
  } catch (error) {
    console.error("获取 GitHub 仓库失败：", error);
    let errorMsg = "获取 GitHub 仓库失败";
    if (error.response?.status === 403) {
      errorMsg = "GitHub API 频率超限/Token 无效，请检查 Token 或稍后再试";
    } else if (error.response?.status === 404) {
      errorMsg = "GitHub 用户名不存在，请核对用户名";
    } else if (error.code === "ECONNABORTED") {
      errorMsg = "请求超时，请检查网络连接";
    } else {
      errorMsg = error.message || errorMsg;
    }
    return { success: false, message: errorMsg };
  }
};

/**
 * 获取 NPM 发布包列表
 */
export const getNpmPackages = async () => {
  try {
    const { npmUsername } = await getLatestConfig();
    const res = await axios.get(
      `https://registry.npmjs.org/-/v1/search?text=author:${npmUsername}`,
    );
    return { success: true, data: res.data.objects };
  } catch (error) {
    console.error("获取 NPM 包失败：", error);
    return { success: false, message: error.message };
  }
};
