import Script from "next/script";
import { getStats, getCategories, getChallenges } from "@/lib/challenges";
import { HomeClient } from "./home-client";
import { setRequestLocale } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [stats, categories, { challenges: featured }] = await Promise.all([
    getStats(),
    getCategories(),
    getChallenges({ pageSize: 6 }, locale),
  ]);

  return (
    <>
      <HomeClient
        stats={stats}
        categories={JSON.parse(JSON.stringify(categories))}
        featured={JSON.parse(JSON.stringify(featured))}
      />
      <Script
        id="tawk-to"
        strategy="lazyOnload"
        dangerouslySetInnerHTML={{
          __html: `
var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
(function(){
var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
s1.async=true;
s1.src='https://embed.tawk.to/69a6ee8d1a02b31c39abc381/1jiq17mh7';
s1.charset='UTF-8';
s1.setAttribute('crossorigin','*');
s0.parentNode.insertBefore(s1,s0);
})();`,
        }}
      />
    </>
  );
}
