import { docsBasePaths } from "@/modules/docs/registry";
import { redirectToFirstDoc } from "@/modules/docs/routes";

export default function Page() {
  return redirectToFirstDoc(docsBasePaths.workspace);
}
