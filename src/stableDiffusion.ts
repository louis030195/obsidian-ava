import fs from "fs";
import path from "path";

const HOST = process.env.API_HOST || "https://obsidian-ai.web.app";
export interface RequestImageCreate {
  // e.g. 512, 768, 1024
  size?: number;
  // e.g. 1, 2, 3, 4
  limit?: number;
  // e.g. "A group of Giraffes visiting a zoo on mars populated by humans"
  prompt: string;
  outputDir: string;
}

// curl -X POST "https://obsidian-ai.web.app/v1/image/create" -H "Content-Type: application/json" -d '{"size":512,"limit":1,"prompt":"A group of Giraffes visiting a zoo on mars populated by humans"}' > giraffes2.jpg

export interface ResponseImageCreate {
  imagePaths: string[];
}

/**
 * Create an image from a prompt
 * Only one image is supported at the moment
 * @param request 
 * @returns 
 */
export const createImage = async (request: RequestImageCreate): Promise<ResponseImageCreate> => {
  const response = await fetch(`${HOST}/v1/image/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      size: request.size || 512,
      limit: request.limit || 1,
      prompt: request.prompt,
    }),
  });
  
  const buffer = Buffer.from(await response.arrayBuffer());
  // file name is "time"_"the prompt as a writable encoded path" (only keep alphanumeric and underscores)
  const fileName = `${Date.now()}_${request.prompt.replace(/[^a-zA-Z0-9_]/g, "_")}`;
  const filePath = path.resolve(
      path.join(
          request.outputDir,
          `${fileName}.jpg`
      )
  );

  fs.writeFileSync(filePath, buffer);

  return {
    imagePaths: [filePath],
  };
};
