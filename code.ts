let currentSLDF: any = null;

figma.showUI(__html__, {
  width: 420,
  height: 500
});

figma.ui.onmessage = async (msg: { type: string }) => {

  // =========================
  // EXPORT SLDF
  // =========================

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

    // Store the generated SLDF so it can later be uploaded.
    currentSLDF = scene;

    figma.ui.postMessage({
      type: "export-result",
      data: JSON.stringify(scene, null, 2)
    });
  }


  // =========================
  // UPLOAD SLDF
  // =========================

  if (msg.type === "upload") {

    if (!currentSLDF) {
      figma.ui.postMessage({
        type: "error",
        message: "Export a design first."
      });
      return;
    }

    await uploadSLDF(currentSLDF);
  }
};


// =========================
// EXPORT NODE
// =========================

function exportNode(node: SceneNode): any {

  const result: any = {

    id: node.id,

    type: convertType(node),

    name: node.name,

    x: node.x,

    y: node.y,

    width: node.width,

    height: node.height,

    rotation: "rotation" in node
      ? node.rotation
      : 0,

    opacity: "opacity" in node
      ? node.opacity
      : 1,

    visible: node.visible
  };


  // =========================
  // FILL
  // =========================

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


  // =========================
  // TEXT
  // =========================

  if (node.type === "TEXT") {

    result.text = node.characters;

    result.fontSize = node.fontSize;

    if (node.fontName !== figma.mixed) {

      result.fontFamily = node.fontName.family;

      result.fontStyle = node.fontName.style;
    }

    result.textAlignHorizontal =
      node.textAlignHorizontal;
  }


  // =========================
  // CORNER RADIUS
  // =========================

  if ("cornerRadius" in node) {

    if (typeof node.cornerRadius === "number") {

      result.cornerRadius =
        node.cornerRadius;
    }
  }


  // =========================
  // CHILDREN
  // =========================

  if ("children" in node) {

    result.children =
      node.children.map(child =>
        exportNode(child)
      );
  }


  return result;
}


// =========================
// NODE TYPE CONVERSION
// =========================

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


// =========================
// UPLOAD TO SOFTBACKGROUNDS API
// =========================

async function uploadSLDF(sldf: any) {

  console.log("UPLOAD: starting");

  try {

    console.log("UPLOAD: sending request");

    const response = await fetch(
      "http://localhost:5000/api/v1/designs",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify(sldf)
      }
    );


    console.log(
      "UPLOAD: response received",
      response.status
    );


    const text = await response.text();
    console.log(
      "UPLOAD: response:",
      text
    );


    let result: any;

    try {

      result = JSON.parse(text);

    } catch {

      throw new Error(
        "Invalid response from server: " + text
      );
    }


    if (!response.ok) {

      throw new Error(
        result.message ||
        `Server returned HTTP ${response.status}`
      );
    }


    console.log(
      "UPLOAD: successful"
    );


    figma.ui.postMessage({

      type: "upload-success",

      message:
        "Design uploaded successfully."
    });


  } catch (error) {

    console.error(
      "UPLOAD ERROR:",
      error
    );


    figma.ui.postMessage({

      type: "error",

      message:
        error instanceof Error
          ? error.message
          : String(error)
    });
  }
}