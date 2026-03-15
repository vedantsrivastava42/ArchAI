import { ColorSchemeScript, mantineHtmlProps } from "@mantine/core";
import { Providers } from "./Providers";
import "@mantine/core/styles.css";
import "@mantine/code-highlight/styles.css";

export const metadata = {
  title: "ArchAI",
  description: "ArchAI application",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript defaultColorScheme="dark" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
