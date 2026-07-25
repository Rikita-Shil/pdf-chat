export const runtime = "nodejs";
export const dynamic = "force-dynamic";


import { CanvasFactory } from "pdf-parse/worker";
import { PDFParse } from "pdf-parse";


const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: Request) {
  let parser: PDFParse | null = null;

  try {
    const formData = await request.formData();
    const uploadedFile = formData.get("file");

    if (!(uploadedFile instanceof File)) {
      return Response.json(
        { error: "No PDF file was provided." },
        { status: 400 }
      );
    }

    const isPdf =
      uploadedFile.type === "application/pdf" ||
      uploadedFile.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      return Response.json(
        { error: "Only PDF files are supported." },
        { status: 400 }
      );
    }

    if (uploadedFile.size > MAX_FILE_SIZE) {
      return Response.json(
        { error: "The PDF must be smaller than 10 MB." },
        { status: 400 }
      );
    }

    const arrayBuffer = await uploadedFile.arrayBuffer();

    parser = new PDFParse({
  data: new Uint8Array(arrayBuffer),
  CanvasFactory,
  useWorkerFetch: false,
  isEvalSupported: false,
  useSystemFonts: true,
});

    const result = await parser.getText();

    const extractedText = result.text.trim();

    if (!extractedText) {
      return Response.json(
        {
          error:
            "No readable text was found. The PDF may be scanned or image-based.",
        },
        { status: 422 }
      );
    }

    return Response.json({
      fileName: uploadedFile.name,
      pageCount: result.total,
      text: extractedText,
      characterCount: extractedText.length,
    });
  } catch (error) {
    console.error("PDF extraction error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Unknown PDF extraction error.";

    return Response.json(
      {
        error: `The PDF could not be processed: ${message}`,
      },
      { status: 500 }
    );
  } finally {
    if (parser) {
      await parser.destroy();
    }
  }
}