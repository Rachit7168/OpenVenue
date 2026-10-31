from drf_spectacular.utils import extend_schema
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import serializers


class HealthSerializer(serializers.Serializer):
    status = serializers.CharField()


@extend_schema(responses=HealthSerializer, auth=[])
@api_view(["GET"])
def health(_request):
    return Response({"status": "ok"})
