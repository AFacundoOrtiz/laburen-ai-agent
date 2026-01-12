const cleanWhatsAppText = (text) => {
  if (!text) return "";

  return text
    .replace(/\*\*/g, "*")
    .replace(/^### (.*$)/gim, "*$1*")
    .replace(/^## (.*$)/gim, "*$1*")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1: $2");
};

export const smartSplit = (text, limit = 1500) => {
  if (!text) return [];

  const cleanText = cleanWhatsAppText(text);

  if (text.length <= limit) return [text];

  const chunks = [];
  let currentText = text;

  while (currentText.length > limit) {
    let splitIndex = currentText.lastIndexOf(" ", limit);

    if (splitIndex === -1) splitIndex = limit;

    chunks.push(currentText.substring(0, splitIndex));

    currentText = currentText.substring(splitIndex).trim();
  }

  if (currentText.length > 0) {
    chunks.push(currentText);
  }

  return chunks;
};
