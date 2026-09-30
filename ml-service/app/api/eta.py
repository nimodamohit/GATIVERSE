from fastapi import APIRouter, HTTPException, status
from app.schemas.eta import ETAPredictionRequest, ETAPredictionResponse
from app.services.predictor import eta_predictor

router = APIRouter(tags=["eta"])

@router.post("/predict-eta", response_model=ETAPredictionResponse, status_code=status.HTTP_200_OK)
async def predict_eta_endpoint(request: ETAPredictionRequest):
    try:
        prediction_data = eta_predictor.predict(request)
        return ETAPredictionResponse(
            success=True,
            data=prediction_data
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate ETA prediction: {str(e)}"
        )
