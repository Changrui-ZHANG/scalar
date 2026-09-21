import { log } from "console";
import { Router } from "express";
import type { Request, Response } from "express";
export class ExercicesController {

    getExercices(req: Request, res: Response) {
        console.log("je suis la");
        res.send("Hello World!");
    }
    postExercies(req: Request, res: Response) {
        console.log("post exercices: ", req.body.data);
        res.send("post: "+req.body.data);
    }

    buildRouter(){
      const router = Router();
      router.get("/", this.getExercices.bind(this));
      router.post("/", this.postExercies.bind(this));
      return router;
    }
}