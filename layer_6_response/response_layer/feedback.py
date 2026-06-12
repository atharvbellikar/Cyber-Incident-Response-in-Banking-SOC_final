from response_layer.interfaces import PostgreSQLClient
from response_layer.logger import logger

class FeedbackCollector:
    def __init__(self, db: PostgreSQLClient):
        self.db = db
        
    async def get_recent_executions(self):
        return await self.db.execute("SELECT * FROM feedback", ())

class ModelRetrainingPipeline:
    def __init__(self, feedback_collector: FeedbackCollector):
        self.collector = feedback_collector

    async def retrain_severity_classifier(self):
        logger.info("Retraining severity classifier based on feedback...")
        # Stub for ML retraining
        pass

    async def optimize_playbook_triggers(self):
        logger.info("Optimizing playbook triggers...")
        pass

    def _calculate_fp_rate(self, executions: list) -> float:
        if not executions:
            return 0.0
        fps = sum(1 for e in executions if e.get("decision") == "reject" and "false positive" in str(e.get("notes", "")).lower())
        return fps / len(executions)

    async def run_nightly_job(self):
        executions = await self.collector.get_recent_executions()
        fp_rate = self._calculate_fp_rate(executions)
        logger.info(f"Current FP Rate: {fp_rate:.2%}")
        
        await self.retrain_severity_classifier()
        await self.optimize_playbook_triggers()
