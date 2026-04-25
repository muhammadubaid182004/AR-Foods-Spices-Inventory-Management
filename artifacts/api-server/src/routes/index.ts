import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import dashboardRouter from "./dashboard";
import regionsRouter from "./regions";
import shopsRouter from "./shops";
import itemsRouter from "./items";
import ordersRouter from "./orders";
import distributorsRouter from "./distributors";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(dashboardRouter);
router.use(regionsRouter);
router.use(shopsRouter);
router.use(itemsRouter);
router.use(ordersRouter);
router.use(distributorsRouter);

export default router;
