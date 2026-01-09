import xlsx from "xlsx";
import fs from "fs";

export class ExcelService {
  static loadData(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`El archivo no existe: ${filePath}`);
    }

    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) throw new Error("El archivo Excel está vacío.");

    const sheet = workbook.Sheets[sheetName];
    return xlsx.utils.sheet_to_json(sheet);
  }
}
