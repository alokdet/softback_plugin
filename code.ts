figma.showUI(__html__, {
  width: 420,
  height: 500
});

figma.ui.onmessage = (msg: { type: string }) => {

  if (msg.type === "export") {

    const selection = figma.currentPage.selection;

    if (selection.length !== 1) {
      figma.ui.postMessage({
        type: "error",
        message: "Select exactly one Frame."
      });
      return;
    }

    const root = selection[0];

    if (root.type !== "FRAME") {
      figma.ui.postMessage({
        type: "error",
        message: "Selected layer must be a Frame."
      });
      return;
    }

    const scene = {
      format: "SLDF",
      version: 1,

      scene: {
        width: root.width,
        height: root.height,

        nodes: root.children.map(child => exportNode(child))
      }
    };

    figma.ui.postMessage({
      type: "export-result",
      data: JSON.stringify(scene, null, 2)
    });
  }
};


function exportNode(node: SceneNode): any {

  const result: any = {

    id: node.id,

    type: convertType(node),

    name: node.name,

    x: node.x,

    y: node.y,

    width: node.width,

    height: node.height,

    rotation: node.rotation,

    opacity: node.opacity,

    visible: node.visible
  };


  // Export solid fill
  if ("fills" in node && Array.isArray(node.fills)) {

    const solidFill = node.fills.find(
      fill => fill.type === "SOLID"
    );

    if (solidFill && solidFill.type === "SOLID") {

      result.fill = {
        type: "solid",

        color: {
          r: solidFill.color.r,
          g: solidFill.color.g,
          b: solidFill.color.b
        },

        opacity: solidFill.opacity ?? 1
      };
    }
  }


  // Export text
  if (node.type === "TEXT") {

    result.text = node.characters;

    result.fontSize = node.fontSize;

    result.fontFamily = node.fontName.family;

    result.fontStyle = node.fontName.style;

    result.textAlignHorizontal = node.textAlignHorizontal;
  }


  // Export corner radius
  if ("cornerRadius" in node) {

    if (typeof node.cornerRadius === "number") {
      result.cornerRadius = node.cornerRadius;
    }
  }


  // Export children
  if ("children" in node) {

    result.children = node.children.map(
      child => exportNode(child)
    );
  }


  return result;
}


function convertType(node: SceneNode): string {

  switch (node.type) {

    case "FRAME":
      return "frame";

    case "GROUP":
      return "group";

    case "RECTANGLE":
      return "rectangle";

    case "ELLIPSE":
      return "ellipse";

    case "TEXT":
      return "text";

    default:
      return "unsupported";
  }
}
