// preload.js
try {
  const fs = require("fs-extra");
  const path = require("path");
  const axios = require("axios");

  const fsApi = {
    readDir: (dirPath) => {
      if (!fs.existsSync(dirPath))
        return { success: false, message: "目录不存在" };
      const files = fs.readdirSync(dirPath, { withFileTypes: true });
      return {
        success: true,
        data: files.map((f) => ({
          name: f.name,
          type: f.isDirectory() ? "目录" : "文件",
          path: path.join(dirPath, f.name),
        })),
      };
    },
  };

  const renderApi = {
    getRenderProjects: async (token) => {
      try {
        const res = await axios.get("https://api.render.com/v1/services", {
          headers: { Authorization: `Bearer ${token}` },
        });
        return { success: true, data: res.data };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },
  };

  // 直接挂载到 window，这在 uTools 中是最稳妥的
  window.utoolsApi = {
    fs: fsApi,
    getRenderProjects: renderApi.getRenderProjects,
    // 补全 Vue 调用的 test 函数
    test: () => {
      console.log("Preload 联通测试成功");
      return { success: true, message: "API Ready" };
    },
  };

  console.log("preload.js 脚本执行完毕");
} catch (error) {
  console.error("preload.js 加载失败，错误信息：", error);
}
