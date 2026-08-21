export default function handler(req, res) {
  const { password } = req.body;

  if (password === process.env.SITE_PASSWORD) {
    res.setHeader(
      "Set-Cookie",
      `seo-tool-auth=ok; Path=/; HttpOnly; Max-Age=${60 * 60 * 24 * 30}`
    );
    return res.status(200).json({ success: true });
  }

  return res.status(401).json({ success: false });
}
