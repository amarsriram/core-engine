import "./globals.css";

export const metadata = {
  title: "CORE ENGINE | Fitness Decision Intelligence",
  description: "Interpretation and interpretation of biological data for optimal progression.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
