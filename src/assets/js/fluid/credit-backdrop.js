// Repaint only the known credit into the optical backdrop. The real HTML keeps
// its text, CSS mask and accessibility; this copy is visible only under water.
export async function createCreditBackdrop(credit) {
  const logo = credit.querySelector(".home-credit-logo");
  const image = new Image();
  image.src = "/assets/images/logo-bytepie@2x.png";
  await Promise.all([document.fonts.ready, image.decode().catch(() => {})]);
  const source = document.createElement("canvas");
  const context = source.getContext("2d");
  const mask = document.createElement("canvas");
  const maskContext = mask.getContext("2d");

  return bounds => {
    const rect = credit.getBoundingClientRect();
    const logoRect = logo.getBoundingClientRect();
    const scale = Math.min(devicePixelRatio || 1, 2);
    source.width = Math.max(1, Math.ceil(rect.width * scale));
    source.height = Math.max(1, Math.ceil(rect.height * scale));
    context.scale(scale, scale);
    const style = getComputedStyle(credit);
    context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    context.fillStyle = style.color;
    context.textBaseline = "alphabetic";

    // Range supplies the actual laid-out text box, including landscape alignment.
    const text = [...credit.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
    if (text) {
      const range = document.createRange();
      range.selectNodeContents(text);
      const line = range.getBoundingClientRect();
      const label = text.textContent.trim();
      const metrics = context.measureText(label);
      context.fillText(label, line.left - rect.left,
        line.bottom - rect.top - metrics.fontBoundingBoxDescent);
    }

    const logoStyle = getComputedStyle(logo);
    const paint = getComputedStyle(logo, "::after");
    if (image.naturalWidth && paint.content !== "none") {
      // Match the live CSS mask, including its tint, at the high-resolution source.
      mask.width = image.naturalWidth;
      mask.height = image.naturalHeight;
      maskContext.drawImage(image, 0, 0);
      maskContext.globalCompositeOperation = "source-in";
      maskContext.fillStyle = paint.backgroundColor;
      maskContext.fillRect(0, 0, mask.width, mask.height);
      context.drawImage(mask, logoRect.left - rect.left, logoRect.top - rect.top,
        logoRect.width, logoRect.height);
    } else {
      context.font = `${logoStyle.fontStyle} ${logoStyle.fontWeight} ${logoStyle.fontSize} ${logoStyle.fontFamily}`;
      context.fillStyle = logoStyle.color;
      context.fillText(logo.textContent, logoRect.left - rect.left,
        logoRect.top - rect.top + context.measureText(logo.textContent).fontBoundingBoxAscent);
    }
    return { source, rect: [(rect.left - bounds.left) / bounds.width,
      (bounds.bottom - rect.bottom) / bounds.height,
      rect.width / bounds.width, rect.height / bounds.height] };
  };
}
