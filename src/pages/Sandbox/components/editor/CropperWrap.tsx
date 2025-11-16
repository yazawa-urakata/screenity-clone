import React, { useState, useEffect, useContext, useRef } from "react";
import { CropperRef, Cropper } from "react-advanced-cropper";
import "react-advanced-cropper/dist/style.css";

// Context
import { ContentStateContext } from "../../context/ContentState";

const CropperWrap: React.FC = () => {
  const contextValue = useContext(ContentStateContext);
  if (!contextValue) return null;
  const [contentState, setContentState] = contextValue;

  const [image, setImage] = useState<string | null>(null);
  const cropperRef = useRef<CropperRef | null>(null);

  useEffect(() => {
    if (!cropperRef.current) return;
    if (!cropperRef.current.getCoordinates()) return;
    if (contentState.fromCropper) return;
    cropperRef.current.setCoordinates({
      top: contentState.top,
      left: contentState.left,
      width: contentState.width,
      height: contentState.height,
    });

    const coordinates = cropperRef.current.getCoordinates();
    if (!coordinates) return;

    if (contentState.top != coordinates.top) {
      setContentState((prevState) => ({
        ...prevState,
        top: coordinates.top,
      }));
    }
    if (contentState.left != coordinates.left) {
      setContentState((prevState) => ({
        ...prevState,
        left: coordinates.left,
      }));
    }
    if (contentState.width != coordinates.width) {
      setContentState((prevState) => ({
        ...prevState,
        width: coordinates.width,
      }));
    }
    if (contentState.height != coordinates.height) {
      setContentState((prevState) => ({
        ...prevState,
        height: coordinates.height,
      }));
    }
  }, [
    contentState.width,
    contentState.height,
    contentState.top,
    contentState.left,
  ]);

  const onChange = (cropper: CropperRef): void => {
    if (!cropper) return;
    const coordinates = cropper.getCoordinates();
    if (!coordinates) return;

    setContentState((prevState) => ({
      ...prevState,
      top: coordinates.top,
      left: coordinates.left,
      width: coordinates.width,
      height: coordinates.height,
      fromCropper: true,
    }));
  };

  useEffect(() => {
    if (!contentState.blob) return;

    setImage(contentState.frame);
  }, [contentState.frame]);

  return (
    <div>
      <Cropper
        src={image}
        ref={cropperRef}
        onChange={onChange}
        className={"cropper"}
        stencilProps={{
          grid: true,
        }}
        defaultSize={{
          width: contentState.width,
          height: contentState.height,
        }}
        backgroundWrapperClassName="CropperBackgroundWrapper"
        transitions={false}
        style={{ transition: "none" }}
      />
    </div>
  );
};

export default CropperWrap;
