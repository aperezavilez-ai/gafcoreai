// ============================================================
//  GafCoreAI - media-router.js
//  Enrutador de Modelos Multimedia, Capacidades & Parámetros
// ============================================================

export const MEDIA_CAPABILITIES = {
  IMAGE_TO_VIDEO: "image_to_video",
  TEXT_TO_VIDEO: "text_to_video",
  TEXT_TO_IMAGE: "text_to_image",
  IMAGE_TO_IMAGE: "image_to_image",
  TEXT_TO_SPEECH: "text_to_speech",
  AUDIO_GENERATION: "audio_generation"
};

export const ASPECT_RATIOS = {
  CINEMATIC_21_9: { id: "21:9", name: "21:9 Cinemascope (Sundance / Cine de Autor)", width: 1920, height: 816, icon: "🎬" },
  WIDESCREEN_16_9: { id: "16:9", name: "16:9 Widescreen (YouTube / TV Standard)", width: 1920, height: 1080, icon: "📺" },
  VERTICAL_9_16: { id: "9:16", name: "9:16 Vertical (Reels / TikTok / Shorts)", width: 1080, height: 1920, icon: "📱" },
  SQUARE_1_1: { id: "1:1", name: "1:1 Square (Instagram / Storyboard)", width: 1080, height: 1080, icon: "⏹️" }
};

export const RESOLUTIONS = {
  HD_720P: { id: "720p", name: "720p HD (Rápido y Económico)", scale: 1 },
  FHD_1080P: { id: "1080p", name: "1080p Full HD (Estándar de Calidad)", scale: 1.5 },
  UHD_4K: { id: "4k", name: "4K Cinema Ultra HD (Máxima Fidelidad)", scale: 2 }
};

export const MEDIA_MODELS = [
  {
    id: "minimax-video-01",
    name: "MiniMax Video-01 (Cinemático)",
    providerId: "meai",
    type: "video",
    capabilities: [MEDIA_CAPABILITIES.IMAGE_TO_VIDEO, MEDIA_CAPABILITIES.TEXT_TO_VIDEO],
    supportedDurations: [5, 10],
    supportedResolutions: ["720p", "1080p"],
    supportedRatios: ["16:9", "9:16", "21:9", "1:1"],
    fps: 25,
    endpointCreate: "/v1/video/generations",
    endpointQuery: "/v1/video/generations"
  },
  {
    id: "minimax-m3",
    name: "MiniMax M3 Multimedia",
    providerId: "meai",
    type: "multimodal",
    capabilities: [MEDIA_CAPABILITIES.IMAGE_TO_VIDEO, MEDIA_CAPABILITIES.TEXT_TO_VIDEO, MEDIA_CAPABILITIES.TEXT_TO_IMAGE],
    supportedDurations: [5, 10],
    supportedResolutions: ["720p", "1080p"],
    supportedRatios: ["16:9", "9:16", "21:9"],
    fps: 24,
    endpointCreate: "/v1/video/generations",
    endpointQuery: "/v1/video/generations"
  },
  {
    id: "apicredits-video",
    name: "APICredits Video Standard",
    providerId: "apicredits",
    type: "video",
    capabilities: [MEDIA_CAPABILITIES.IMAGE_TO_VIDEO, MEDIA_CAPABILITIES.TEXT_TO_VIDEO],
    supportedDurations: [5, 10],
    supportedResolutions: ["720p", "1080p"],
    supportedRatios: ["16:9", "9:16", "1:1"],
    fps: 24,
    endpointCreate: "/v1/video/generations",
    endpointQuery: "/v1/video/generations"
  },
  {
    id: "grok-video",
    name: "Grok Video 4.5 (APICredits)",
    providerId: "apicredits",
    type: "video",
    capabilities: [MEDIA_CAPABILITIES.IMAGE_TO_VIDEO, MEDIA_CAPABILITIES.TEXT_TO_VIDEO],
    supportedDurations: [5, 10],
    supportedResolutions: ["720p", "1080p"],
    supportedRatios: ["16:9", "9:16", "21:9"],
    fps: 24,
    endpointCreate: "/v1/video/generations",
    endpointQuery: "/v1/video/generations"
  }
];

export class MediaRouter {
  constructor(options = {}) {
    if (Array.isArray(options)) {
      this.providersList = options;
      this.options = {};
    } else {
      this.options = options || {};
      this.providersList = options.providers || [];
    }
  }

  getProviders() {
    if (typeof this.options.getProviders === "function") {
      return this.options.getProviders() || [];
    }
    return this.providersList || [];
  }

  setProviders(providers) {
    this.providersList = providers;
  }

  /**
   * Obtiene todos los modelos que soportan una capacidad específica
   */
  getModelsForCapability(capability) {
    return MEDIA_MODELS.filter(m => m.capabilities.includes(capability));
  }

  /**
   * Resuelve un modelo específico por ID y su key asociada
   */
  resolveModel(modelId) {
    const model = MEDIA_MODELS.find(m => m.id === modelId);
    if (!model) return null;

    const providers = this.getProviders();
    const prov = providers.find(p => p.id === model.providerId);
    let resolvedKey = "";
    let providerUrl = "";

    if (prov) {
      providerUrl = prov.url || "";
      if (prov.groups) {
        for (const g of prov.groups) {
          if ((g.models.includes(model.id) || g.name === model.id) && g.key) {
            resolvedKey = g.key;
            break;
          }
        }
        if (!resolvedKey && prov.groups[0] && prov.groups[0].key) {
          resolvedKey = prov.groups[0].key;
        }
      }
    }

    return {
      model,
      provider: prov,
      url: providerUrl,
      key: resolvedKey
    };
  }

  /**
   * Resuelve el mejor modelo y su API Key correspondiente
   */
  resolveBestModel(capability, preferredModelId = null) {
    const candidates = this.getModelsForCapability(capability);
    if (!candidates.length) return null;

    let selectedModel = null;
    if (preferredModelId) {
      selectedModel = candidates.find(c => c.id === preferredModelId);
    }

    if (!selectedModel) {
      selectedModel = candidates[0];
    }

    const resolved = this.resolveModel(selectedModel.id);
    return {
      model: selectedModel,
      provider: resolved ? resolved.provider : null,
      providerUrl: resolved ? resolved.url : "",
      key: resolved ? resolved.key : ""
    };
  }

  /**
   * Inyecta descriptores cinematográficos para elevar el nivel visual a estándar Sundance / Cine
   */
  enhancePromptCinematic(prompt, { aspectRatio = "16:9", style = "cinematic", resolution = "1080p" } = {}) {
    if (!prompt) return "";
    let p = prompt.trim();

    const cinematicKeywords = [
      "cinematography", "35mm anamorphic lens", "shallow depth of field",
      "Kodak Vision3 500T film grain", "natural cinematic lighting",
      "atmospheric mood", "high dynamic range"
    ];

    if (!p.toLowerCase().includes("lens") && !p.toLowerCase().includes("cinemat")) {
      p += `, ${cinematicKeywords.slice(0, 4).join(", ")}`;
    }

    if (aspectRatio === "21:9" || aspectRatio === "CINEMATIC_21_9") {
      p += ", 21:9 aspect ratio, widescreen 2.39:1 anamorphic framing";
    }

    return p;
  }

  buildCinematicPrompt(prompt, options = {}) {
    const ratio = options.ratioId || options.aspectRatio || "16:9";
    const enhanced = this.enhancePromptCinematic(prompt, { aspectRatio: ratio, ...options });
    return {
      originalPrompt: prompt,
      enhancedPrompt: enhanced,
      aspectRatio: ratio
    };
  }
}
