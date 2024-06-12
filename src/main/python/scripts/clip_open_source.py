import torch
import numpy as np
from PIL import Image
import open_clip
import os
import shutil
from scripts.deepltranslator import auto_detect_translate

def get_top_n_images(image_directory="..\..\..\\runtime-data\images\\file", features_directory=".\\features", terms_list=[]):
    """
    Main function to find relevant images for a list of terms based on their features.

    Parameters:
    - image_directory (str): The directory containing image files.
    - terms_filename (str): The filename of the text file containing a list of terms.

    Returns:
    - dict: A dictionary mapping terms to a list of relevant images with their probabilities.
    """
    # get image file list
    image_list = []
    for filename in os.listdir(image_directory):
        if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.gif')):
            image_list.append(os.path.join(image_directory, filename))

    # get terms list 
    terms_list = [auto_detect_translate(term) for term in terms_list]
    print("Terms list")
    print(terms_list)

    # fetch image tagging model
    model, _, preprocess = open_clip.create_model_and_transforms('ViT-B-32', pretrained='laion2b_s34b_b79k')
    tokenizer = open_clip.get_tokenizer('ViT-B-32')

    # get image and text features
    print("Getting text features")
    text_features = encode_terms(terms_list, model, tokenizer)
    print("Getting image features")
    image_list, image_features = encode_images(image_list, model, preprocess, features_dir=features_directory, features_file="image_features.pth")
    print('Done')

    return find_relevant_images_for_terms(terms_list, text_features, image_list, image_features)


def find_relevant_images_for_terms(terms, term_features, images, image_features,
                                   min_confidence=0.005, max_relevant_images=5):
    """
    Find relevant images for a list of terms based on their features.

    Parameters:
    - terms (list of str): The list of terms.
    - term_features (Tensor): Tensor containing text features.
    - images (list of str): List of image file paths.
    - image_features (Tensor): Tensor containing image features.
    - min_confidence (float): Minimum confidence threshold.
    - max_relevant_images (int): Maximum number of relevant images to retrieve.

    Returns:
    - dict: A dictionary mapping terms to a list of relevant images with their probabilities.
    """
    related_images = {}
    for i in range(len(term_features)):
        term_feature = term_features[i]
        image_probs = (100.0 * term_feature @ image_features.T).softmax(dim=-1) #Calculate the probabilities of images being relevant to the term 
        image_probs_float = np.array(image_probs.tolist()[0]) # Convert the image probabilities to a NumPy array
        probs = np.column_stack([images, image_probs_float]) # Stack image file paths and probabilities as columns
        probs = probs[probs[:, 1].astype(float) > min_confidence] # Filter images based on minimum confidence threshold
        probs = probs[probs[:, 1].astype(float).argsort()[::-1]] # Sort images by probability in descending order
        term_result = probs[:max_relevant_images] # Retrieve the top N relevant images for the term
        related_images[terms[i]] = term_result # Store the term and its relevant images in the dictionary

    return related_images


def save_features(item_list, feature_list, dirname, filename):
    zipped_list = list(zip(item_list, feature_list))
    filepath = os.path.join(dirname, filename)  
    if not os.path.exists(dirname):
        os.makedirs(dirname)
        print(f"Directory '{dirname}' created successfully.")

    if os.path.exists(filepath):
        print(filepath + " exists")
        filepath_backup = os.path.join(dirname, filename+"__backup")
        shutil.copyfile(filepath, filepath_backup)
    print("Saving features at "+filepath)
    torch.save(zipped_list, filepath)

def load_features(dirname, filename, check_for_delete=False):
    filepath = os.path.join(dirname, filename)
    if os.path.exists(filepath):
        loaded_tuples = torch.load(filepath)
        if check_for_delete:
            index = 0
            while index < len(loaded_tuples):
                item_path, feature = loaded_tuples[index]
                
                if os.path.exists(item_path):
                    # If the file path exists, move to the next tuple
                    index += 1
                else:
                    # If the file path doesn't exist, remove the tuple from the list
                    print(f"File path '{item_path}' does not exist. Removing corresponding tuple.")
                    del loaded_tuples[index]

        return loaded_tuples
        updated_strings, updated_features = zip(*loaded_tuples)
    return None


def encode_images(image_list, model, preprocess, features_dir, features_file):
    """
    Encode a list of images into image features.

    Parameters:
    - image_list (list of str): List of image file paths.
    - model: The image tagging model.
    - preprocess: Preprocessing function for images.

    Returns:
    - Tensor: Tensor containing encoded image features.
    """

    loaded_features = load_features(features_dir, features_file, check_for_delete=True)
    if loaded_features is not None:
        print("Loaded image features")
        existing_images, existing_features = zip(*loaded_features)
        existing_images = list(existing_images)
        print("existing_features b4")
        print(existing_features)
        existing_features = torch.stack(existing_features, dim=0)
        print("existing_features after4")
        print(existing_features)
        index = 0
        while index<len(image_list):
            if image_list[index] in existing_images:
                print("delling: "+image_list[index])
                del image_list[index]
            else:
                index += 1
        print("new image list: ")
        print(image_list)


    encoded_images = []
    with torch.no_grad(), torch.cuda.amp.autocast():
        for image in image_list:
            image = preprocess(Image.open(image)).unsqueeze(0)
            image_features = model.encode_image(image)
            image_features /= image_features.norm(dim=-1, keepdim=True)
            encoded_images.append(image_features)
    print("Enc images before cat: "+str(encoded_images))
    if len(encoded_images)>0:
        encoded_images = torch.cat(encoded_images, 0)
    print("Enc images after cat: "+str(encoded_images))

    if loaded_features is None:
        final_image_list = image_list
        final_image_features = encoded_images
    else:
        print("existingimages")
        print(existing_images)
        print("imageslist")
        print(image_list)
        final_image_list = existing_images + image_list
        print("old shape:")
        print(existing_features.shape)
        if encoded_images == []:
            final_image_features = existing_features
        else:
            print("new shape:")
            print(encoded_images.shape)
            final_image_features = torch.cat((existing_features, encoded_images), dim=0)

    print("FINAL IMAGE LIST: ")
    print(final_image_list)
    print("FINAL IMAGE FEATURES: ")
    print(final_image_features)

    save_features(final_image_list, final_image_features, features_dir, features_file)

    return (final_image_list, final_image_features)


def encode_terms(terms_list, model, tokenizer):
    """
    Encode a list of terms into text features.

    Parameters:
    - terms_list (list of str): List of terms.
    - model: The image tagging model.
    - tokenizer: Tokenizer for terms.

    Returns:
    - Tensor: Tensor containing encoded text features.
    """
    encoded_terms = []
    with torch.no_grad(), torch.cuda.amp.autocast():
        for term_raw in terms_list:
            term = tokenizer(term_raw)
            text_features = model.encode_text(term)
            text_features /= text_features.norm(dim=-1, keepdim=True)
            encoded_terms.append(text_features)
    encoded_terms = torch.stack(encoded_terms)
    return encoded_terms



