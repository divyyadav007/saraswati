import StorefrontLayout from "./(storefront)/layout";
import StorefrontHomePage from "./(storefront)/page";

export default function RootHomePage() {
  return (
    <StorefrontLayout>
      <StorefrontHomePage />
    </StorefrontLayout>
  );
}
