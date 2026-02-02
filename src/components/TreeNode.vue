<!-- src/components/TreeNode.vue -->
<template>
  <div class="tree-node">
    <div class="node-header" @click="onToggleExpand">
      <span class="expand-icon" v-if="node.type === 'dir'">
        {{ expanded ? "▼" : "▶" }}
      </span>
      <span class="node-icon">
        {{ node.type === "dir" ? "📁" : "📄" }}
      </span>
      <span
        class="node-name"
        :class="{ file: node.type === 'file' }"
        @click.stop="node.type === 'file' ? onOpenFile(node) : null"
      >
        {{ node.name }}
      </span>
    </div>
    <div
      class="node-children"
      v-if="node.type === 'dir' && expanded"
      v-show="expanded"
    >
      <tree-node
        v-for="child in node.children"
        :key="child.path || child.webkitRelativePath"
        :node="child"
        @open-file="handleChildOpenFile"
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";

const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["open-file"]);

const expanded = ref(false);

// 切换文件夹展开/折叠状态
const onToggleExpand = () => {
  if (props.node.type === "dir") {
    expanded.value = !expanded.value;
  }
};

// 打开文件预览
const onOpenFile = (file) => {
  emit("open-file", file);
};

// 处理子节点的文件打开事件
const handleChildOpenFile = (file) => {
  emit("open-file", file);
};
</script>

<style scoped>
.tree-node {
  margin-left: 8px;
}

.node-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.node-header:hover {
  background-color: #f1f5f9;
}

.expand-icon {
  font-size: 10px;
  color: #64748b;
  width: 12px;
  display: inline-block;
}

.node-icon {
  font-size: 14px;
  width: 18px;
}

.node-name {
  flex: 1;
  color: #263238;
}

.node-name.file {
  color: #3b82f6;
  text-decoration: underline;
  text-decoration-style: dotted;
}

.node-children {
  margin-left: 20px;
  margin-top: 4px;
}
</style>