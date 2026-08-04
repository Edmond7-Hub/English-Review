#!/usr/bin/swift
import Foundation
import Vision
import AppKit
import CoreImage
import PDFKit

// Simple command-line tool to OCR an image or PDF page using macOS Vision framework.
// Usage: swift ocr_with_vision.swift <input_path> [lang]

let args = CommandLine.arguments
if args.count < 2 {
    print("Usage: swift ocr_with_vision.swift <input_path> [lang]")
    exit(1)
}

let inputPath = args[1]
let lang = args.count > 2 ? args[2] : "zh-Hans,en"

func recognizeText(in image: CGImage, completion: @escaping (String) -> Void) {
    let request = VNRecognizeTextRequest { (request, error) in
        guard let observations = request.results as? [VNRecognizedTextObservation] else {
            completion("")
            return
        }
        let text = observations.compactMap { observation in
            observation.topCandidates(1).first?.string
        }.joined(separator: "\n")
        completion(text)
    }
    request.recognitionLanguages = [lang]
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = true
    
    let handler = VNImageRequestHandler(cgImage: image, options: [:])
    do {
        try handler.perform([request])
    } catch {
        print("Error performing OCR: \(error)")
        completion("")
    }
}

func ocrPDF(path: String) {
    guard let pdfDocument = PDFDocument(url: URL(fileURLWithPath: path)) else {
        print("Failed to open PDF: \(path)")
        return
    }
    
    let pageCount = pdfDocument.pageCount
    for i in 0..<pageCount {
        guard let page = pdfDocument.page(at: i) else { continue }
        let bounds = page.bounds(for: .mediaBox)
        let scale: CGFloat = 2.0
        let size = CGSize(width: bounds.width * scale, height: bounds.height * scale)
        
        guard let image = page.thumbnail(of: size, for: .mediaBox).cgImage(forProposedRect: nil, context: nil, hints: nil) else {
            print("Failed to render page \(i + 1)")
            continue
        }
        
        let semaphore = DispatchSemaphore(value: 0)
        var resultText = ""
        recognizeText(in: image) { text in
            resultText = text
            semaphore.signal()
        }
        semaphore.wait()
        
        print("--- Page \(i + 1) ---")
        print(resultText)
        print()
    }
}

func ocrImage(path: String) {
    guard let image = NSImage(contentsOfFile: path)?.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
        print("Failed to load image: \(path)")
        return
    }
    let semaphore = DispatchSemaphore(value: 0)
    recognizeText(in: image) { text in
        print(text)
        semaphore.signal()
    }
    semaphore.wait()
}

if inputPath.lowercased().hasSuffix(".pdf") {
    ocrPDF(path: inputPath)
} else {
    ocrImage(path: inputPath)
}
