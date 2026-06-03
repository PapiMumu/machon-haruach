import { Layout } from "@/components";
import { LogoutPage } from "@machonharuach/apphelper-login";

export default function Logout() {
  return (
    <Layout withoutNavbar withoutFooter>
      <LogoutPage />
    </Layout>
  );
}
