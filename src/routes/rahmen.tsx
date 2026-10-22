import { createFileRoute } from "@tanstack/react-router";
import { AlbumLogin } from "@/components/album-login";
import { GalleryExperience } from "@/components/gallery-experience";
import { useAlbumAccess, useSiteConfig } from "@/lib/use-album-access";

// Bilderrahmen-Modus: eigene, PIN-freie Adresse für TV/Tablet.
// Zugriff per geheimem Token (FRAME_TOKEN env), danach dauerhaft (Cookie 1 Jahr).
export const Route = createFileRoute("/rahmen")({
  head: () => ({
    meta: [
      { title: "Bilderrahmen" },
      { name: "robots", content: "noindex, nofollow, noimageindex" },
    ],
  }),
  component: FramePage,
});

function FramePage() {
  const config = useSiteConfig();
  const access = useAlbumAccess({ authEndpoint: "/api/frame-auth", bodyKey: "token" });

  if (access.status === "unlocked") {
    return (
      <GalleryExperience
        items={access.items}
        musicTracks={access.musicTracks}
        rememberedHint={false}
        coupleNames={config.coupleNames}
        weddingDate={config.weddingDate}
        frameMode
        onExit={() => {}}
        onRefresh={access.reload}
      />
    );
  }

  return (
    <AlbumLogin
      variant="frame"
      config={config}
      status={access.status}
      secret={access.secret}
      setSecret={access.setSecret}
      error={access.error}
      errorNonce={access.errorNonce}
      lockedForSeconds={access.lockedForSeconds}
      submitting={access.submitting}
      onSubmit={access.submit}
    />
  );
}
