use soroban_sdk::{contracttype, Env, String};

use crate::{DataKey, Error};

pub const MAX_DOCS_URL_LEN: u32 = 512;

#[contracttype]
#[derive(Clone, Debug)]
pub struct VaultMetadata {
    /// Human-readable vault name. Maximum length: 64 characters.
    pub name: String,
    /// Human-readable vault description. Maximum length: 256 characters.
    pub description: String,
    /// Vault risk rating from 1 through 5.
    pub risk_rating: u8,
    /// Optional documentation URL. Empty is allowed; non-empty values are capped at 512 characters.
    pub docs_url: String,
}

pub fn set_vault_metadata(env: &Env, metadata: VaultMetadata) -> Result<(), Error> {
    // Validate name <= 64 chars
    if metadata.name.len() > 64 {
        return Err(Error::MetadataNameTooLong);
    }

    // Validate description <= 256 chars
    if metadata.description.len() > 256 {
        return Err(Error::MetadataDescriptionTooLong);
    }

    // Validate risk_rating in 1–5
    if metadata.risk_rating < 1 || metadata.risk_rating > 5 {
        return Err(Error::InvalidRiskRating);
    }

    // Validate docs_url <= 512 chars; empty docs_url is allowed.
    if metadata.docs_url.len() > MAX_DOCS_URL_LEN {
        return Err(Error::InvalidConfig);
    }

    env.storage()
        .persistent()
        .set(&DataKey::VaultMetadata, &metadata);

    env.events().publish(
        (symbol_short!("meta"), symbol_short!("updated")),
        (metadata.name.clone(), metadata.risk_rating),
    );

    Ok(())
}

pub fn get_vault_metadata(env: &Env) -> Option<VaultMetadata> {
    env.storage()
        .persistent()
        .get(&DataKey::VaultMetadata)
}

#[cfg(test)]
mod tests {
    extern crate std;

    use super::*;
    use soroban_sdk::String as SorobanString;

    fn metadata_with_docs_url(env: &Env, docs_url: SorobanString) -> VaultMetadata {
        VaultMetadata {
            name: SorobanString::from_str(env, "Volatility Shield"),
            description: SorobanString::from_str(env, "Vault metadata"),
            risk_rating: 3,
            docs_url,
        }
    }

    #[test]
    fn accepts_valid_docs_url() {
        let env = Env::default();
        let metadata = metadata_with_docs_url(
            &env,
            SorobanString::from_str(&env, "https://docs.xhedge.example/vault"),
        );

        assert_eq!(set_vault_metadata(&env, metadata), Ok(()));
    }

    #[test]
    fn accepts_empty_docs_url() {
        let env = Env::default();
        let metadata = metadata_with_docs_url(&env, SorobanString::from_str(&env, ""));

        assert_eq!(set_vault_metadata(&env, metadata), Ok(()));
    }

    #[test]
    fn accepts_docs_url_at_max_length() {
        let env = Env::default();
        let url = std::string::String::from("a").repeat(MAX_DOCS_URL_LEN as usize);
        let metadata = metadata_with_docs_url(&env, SorobanString::from_str(&env, &url));

        assert_eq!(set_vault_metadata(&env, metadata), Ok(()));
    }

    #[test]
    fn rejects_docs_url_over_max_length() {
        let env = Env::default();
        let url = std::string::String::from("a").repeat(MAX_DOCS_URL_LEN as usize + 1);
        let metadata = metadata_with_docs_url(&env, SorobanString::from_str(&env, &url));

        assert_eq!(set_vault_metadata(&env, metadata), Err(Error::InvalidConfig));
    }
}
