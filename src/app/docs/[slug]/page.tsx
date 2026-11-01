import { docMetadata, docStaticParams, PublicDocsPage } from "@/modules/docs/routes";

export const dynamicParams = false;
export const generateStaticParams = docStaticParams;
export const generateMetadata = docMetadata;
export default PublicDocsPage;
