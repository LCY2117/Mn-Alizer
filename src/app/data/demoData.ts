import importedDemoData from "../../imports/demo_data.json";

export const demoData = importedDemoData;

export type DemoData = typeof demoData;
export type MaterialId = DemoData["materials"][number]["material_id"];
