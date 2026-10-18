import { Router } from "express";
import type { Request, Response } from "express";
import { TrackService } from "../services/track.service.ts";
import { respond } from "./respond.ts";

export class TrackController {
  private readonly service: TrackService;

  constructor(service: TrackService) {
    this.service = service;
  }

  async listTracks(_req: Request, res: Response) {
    await respond(res, "Aucun parcours.", () => this.service.listTracks());
  }

  async getTrack(req: Request<{ track: string }>, res: Response) {
    await respond(res, "Parcours introuvable.", () => this.service.getTrack(req.params.track));
  }

  buildRouter() {
    const router = Router();
    router.get("/tracks", this.listTracks.bind(this));
    router.get("/tracks/:track", this.getTrack.bind(this));
    return router;
  }
}
