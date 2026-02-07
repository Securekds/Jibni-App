from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)
from django.conf.urls.static import static
urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/passport/", include("passport.urls")),
    path("api/v1/wire/", include("wire.urls")),
    path("api/v1/dashboard/", include("dashboard.urls"))
]


urlpatterns += [
    path("api/v1/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/v1/docs/swagger/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path(
        "api/v1/docs/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"
    ),
]


if settings.DEBUG:

    import debug_toolbar

    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += [
        path("__debug__/", include(debug_toolbar.urls)),
        path("silk/", include("silk.urls", namespace="silk")),
    ]


