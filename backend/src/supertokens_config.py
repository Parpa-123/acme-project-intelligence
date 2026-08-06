import os
from typing import Dict, Any
from dotenv import load_dotenv

from supertokens_python import init, InputAppInfo, SupertokensConfig
from supertokens_python.recipe import thirdparty, session
from supertokens_python.recipe.thirdparty import (
    ProviderInput,
    ProviderConfig,
    ProviderClientConfig,
    SignInAndUpFeature,
)
from supertokens_python.recipe.thirdparty.interfaces import RecipeInterface

# Import our database and models
from src.database import SessionLocal
from src.models import User, SocialAccount
from src.schemas import AuthProvider

load_dotenv()

def override_thirdparty_functions(original_implementation: RecipeInterface):
    original_sign_in_up = original_implementation.sign_in_up

    async def sign_in_up(
        third_party_id: str,
        third_party_user_id: str,
        email: str,
        **kwargs
    ):
        result = await original_sign_in_up(
            third_party_id=third_party_id,
            third_party_user_id=third_party_user_id,
            email=email,
            **kwargs
        )

        is_success = False
        created_new_user = False
        if hasattr(result, "is_ok"):
            is_success = getattr(result, "is_ok")
            created_new_user = getattr(result, "created_new_user", False)
        elif type(result).__name__ == "SignInUpOkResult":
            is_success = True
            created_new_user = getattr(result, "created_new_recipe_user", False)

        if is_success and created_new_user:
            raw_user_id = getattr(result.user, "id", getattr(result.user, "user_id", ""))
            supertokens_user_id = raw_user_id.get_as_string() if hasattr(raw_user_id, "get_as_string") else str(raw_user_id)
            # Extract basic info
            raw_info = kwargs.get("raw_user_info_from_provider")
            user_info = {}
            if hasattr(raw_info, "from_user_info_api"):
                user_info = raw_info.from_user_info_api or raw_info.from_id_token_payload or {}
            elif isinstance(raw_info, dict):
                user_info = raw_info

            avatar_url = user_info.get("picture") or user_info.get("avatar_url")
            full_name = user_info.get("name")
            # Save to PostgreSQL
            db = SessionLocal()
            try:
                new_user = User(
                    supertokens_id=supertokens_user_id,
                    email=email,
                    full_name=full_name,
                    avatar_url=avatar_url
                )
                db.add(new_user)
                db.flush() # flush to get the new_user.id
                
                # Link the social account
                provider_enum = AuthProvider.GOOGLE if third_party_id == "google" else AuthProvider.GITHUB
                social_acc = SocialAccount(
                    user_id=new_user.id,
                    provider=provider_enum,
                    provider_id=third_party_user_id
                )
                db.add(social_acc)
                db.commit()
            except Exception as e:
                db.rollback()
                print(f"Failed to create user in PostgreSQL: {e}")
            finally:
                db.close()

        return result

    original_implementation.sign_in_up = sign_in_up
    return original_implementation


def init_supertokens() -> None:
    """Wire up SuperTokens against the self-hosted core running in Docker."""

    init(
        framework="fastapi",
        supertokens_config=SupertokensConfig(
            connection_uri=os.environ.get(
                "SUPERTOKENS_CONNECTION_URI", "http://supertokens:3567"
            ),
            api_key=os.environ.get("SUPERTOKENS_API_KEY", "Pass-12345678901234567890"),
        ),
        app_info=InputAppInfo(
            app_name=os.environ.get("APP_NAME", "MyApp"),
            api_domain=os.environ.get("API_DOMAIN", os.environ.get("RENDER_EXTERNAL_URL", "http://localhost:8000")),
            website_domain=os.environ.get("WEBSITE_DOMAIN", os.environ.get("VITE_WEB_URL", "http://localhost:3000")),
            api_base_path="/auth",
            website_base_path="/auth",
        ),
        recipe_list=[
            thirdparty.init(
                sign_in_and_up_feature=SignInAndUpFeature(
                    providers=[
                        ProviderInput(
                            config=ProviderConfig(
                                third_party_id="google",
                                clients=[
                                    ProviderClientConfig(
                                        client_id=os.environ.get("GOOGLE_CLIENT_ID", ""),
                                        client_secret=os.environ.get("GOOGLE_CLIENT_SECRET", ""),
                                        scope=[
                                            "https://www.googleapis.com/auth/userinfo.email",
                                            "https://www.googleapis.com/auth/userinfo.profile",
                                            "openid",
                                        ],
                                    ),
                                ],
                            ),
                        ),
                        ProviderInput(
                            config=ProviderConfig(
                                third_party_id="github",
                                clients=[
                                    ProviderClientConfig(
                                        client_id=os.environ.get("GITHUB_CLIENT_ID", ""),
                                        client_secret=os.environ.get("GITHUB_CLIENT_SECRET", ""),
                                        scope=["read:user", "user:email"],
                                    ),
                                ],
                            ),
                        ),
                    ]
                ),
                override=thirdparty.InputOverrideConfig(
                    functions=override_thirdparty_functions
                )
            ),
            session.init(
                cookie_secure=os.environ.get("COOKIE_SECURE", "false").lower() == "true",
                cookie_same_site="lax",
            ),
        ],
    )