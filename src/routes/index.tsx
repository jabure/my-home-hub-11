import { createFileRoute } from "@tanstack/react-router";
import { AlbumLogin } from "@/components/album-login";
import { GalleryExperience } from "@/components/gallery-experience";
import { useAlbumAccess, useSiteConfig } from "@/lib/use-album-access";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Unser Hochzeitsalbum" },
      { name: "description", content: "Privates Hochzeitsalbum – Zugang nur mit PIN." },
      { property: "og:title", content: "Unser Hochzeitsalbum" },
      { property: "og:description", content: "Privates Hochzeitsalbum – Zugang nur mit PIN." },
      // Seite und Fotos nicht in Suchmaschinen aufnehmen
      { name: "robots", content: "noindex, nofollow, noimageindex, nosnippet" },
      { property: "og:image", content: "/og-image.jpg" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Home,
});

function Home() {
  const config = useSiteConfig();
  const access = useAlbumAccess({ authEndpoint: "/api/gallery-auth", bodyKey: "pin" });

  if (access.status === "unlocked") {
    return (
      <GalleryExperience
        items={access.items}
        musicTracks={access.musicTracks}
        rememberedHint={access.rememberedHint}
        coupleNames={config.coupleNames}
        weddingDate={config.weddingDate}
        onExit={access.logout}
        onRefresh={access.reload}
      />
    );
  }

  return (
    <AlbumLogin
      variant="pin"
      config={config}
      status={access.status}
      secret={access.secret}
      setSecret={access.setSecret}
      error={access.error}
      errorNonce={access.errorNonce}
      lockedForSeconds={access.lockedForSeconds}
      submitting={access.submitting}
      opening={access.opening}
      onSubmit={access.submit}
    />
  );
}
